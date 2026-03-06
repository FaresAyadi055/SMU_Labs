import { defineEventHandler, readBody, createError } from 'h3'
import mongoose from 'mongoose'
import Request from '~/server/models/Requests'
import Component from '~/server/models/Components'
import Log from '~/server/models/Logs'
import connectDB from '~/server/utils/db'
import { requireRole } from '~/server/utils/auth'

type CartItem = {
  requestId: string
  approvedQuantity: number
  decision: 'approve' | 'decline'
}

export default defineEventHandler(async (event) => {
  const session = await mongoose.startSession()

  try {
    await connectDB()

    // Only instructors/technicians and admins can process carts
    const currentUser = requireRole(event, ['instructor', 'admin', 'superadmin'])

    let body: { items?: CartItem[] }
    try {
      body = await readBody(event)
    } catch (bodyError) {
      console.error('Error reading body in process-cart:', bodyError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid JSON body',
      })
    }

    const items = body.items || []

    if (!Array.isArray(items) || items.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No cart items provided',
      })
    }

    // Basic validation
    for (const item of items) {
      if (!item.requestId || !mongoose.Types.ObjectId.isValid(item.requestId)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid requestId in cart items',
        })
      }
      if (!['approve', 'decline'].includes(item.decision)) {
        throw createError({
          statusCode: 400,
          statusMessage:
            'Invalid decision for cart item, expected "approve" or "decline"',
        })
      }
      if (item.decision === 'approve') {
        if (
          typeof item.approvedQuantity !== 'number' ||
          !Number.isFinite(item.approvedQuantity) ||
          item.approvedQuantity <= 0
        ) {
          throw createError({
            statusCode: 400,
            statusMessage:
              'Approved quantity must be a positive number for approved items',
          })
        }
      }
    }

    // Start transaction
    session.startTransaction()

    const processed: any[] = []

    for (const item of items) {
      const request = await Request.findById(item.requestId)
        .session(session)
        .populate('component_id', 'model description link quantity')

      if (!request) {
        throw createError({
          statusCode: 404,
          statusMessage: `Request not found: ${item.requestId}`,
        })
      }

      if (request.status !== 'pending') {
        throw createError({
          statusCode: 400,
          statusMessage: `Request ${item.requestId} is not pending`,
        })
      }

      const component = request.component_id as any
      if (!component) {
        throw createError({
          statusCode: 404,
          statusMessage: `Component not found for request ${item.requestId}`,
        })
      }

      if (item.decision === 'decline') {
        // Just mark as declined, no inventory change
        request.status = 'declined'
        await request.save({ session })

        const log = new Log({
          action: 'REQUEST_DECLINE',
          userId: new mongoose.Types.ObjectId(currentUser.userId),
          userEmail: currentUser.email,
          userRole: currentUser.role,
          metadata: {
            entityId: request._id,
            entityType: 'request',
            requestStatus: 'declined',
            itemId: component._id,
            itemModel: component.model,
            quantity: {
              previous: component.quantity,
              new: component.quantity,
              change: 0,
            },
            description: 'Request declined from technician dashboard',
          },
        })
        await log.save({ session })

        processed.push({
          requestId: String(request._id),
          status: request.status,
          approvedQuantity: 0,
        })

        continue
      }

      // Approve flow
      const approvedQty = item.approvedQuantity
      const originalQty = request.quantity_requested // capture before any mutation

      if (approvedQty > component.quantity) {
        throw createError({
          statusCode: 400,
          statusMessage: `Insufficient stock for component ${component.model}. Available: ${component.quantity}, requested: ${approvedQty}`,
        })
      }

      const previousQuantity = component.quantity
      const newQuantity = previousQuantity - approvedQty

      // Deduct inventory
      component.quantity = newQuantity
      await component.save({ session })

      // Update request status and reflect the actual approved quantity
      request.status = 'approved'
      request.quantity_requested = approvedQty
      await request.save({ session })

      // Log the approval
      const approveLog = new Log({
        action: 'REQUEST_APPROVE',
        userId: new mongoose.Types.ObjectId(currentUser.userId),
        userEmail: currentUser.email,
        userRole: currentUser.role,
        metadata: {
          entityId: request._id,
          entityType: 'request',
          requestStatus: 'approved',
          itemId: component._id,
          itemModel: component.model,
          quantity: {
            previous: previousQuantity,
            new: newQuantity,
            change: -approvedQty,
          },
          approvedQuantity: approvedQty,
          requestedQuantity: originalQty,
          description: 'Request approved and inventory decremented via technician dashboard',
        },
      })
      await approveLog.save({ session })

      processed.push({
        requestId: String(request._id),
        status: request.status,
        approvedQuantity: approvedQty,
        remainingStock: newQuantity,
      })

      // If partially approved, create a companion declined request for the remainder
      const declinedQty = originalQty - approvedQty
      if (declinedQty > 0) {
        const declinedRequest = new Request({
          ...request.toObject(),
          _id: new mongoose.Types.ObjectId(),   // new identity
          status: 'declined',
          quantity_requested: declinedQty,
        })
        await declinedRequest.save({ session })

        const declineLog = new Log({
          action: 'REQUEST_DECLINE',
          userId: new mongoose.Types.ObjectId(currentUser.userId),
          userEmail: currentUser.email,
          userRole: currentUser.role,
          metadata: {
            entityId: declinedRequest._id,
            entityType: 'request',
            requestStatus: 'declined',
            itemId: component._id,
            itemModel: component.model,
            quantity: {
              previous: component.quantity,
              new: component.quantity,
              change: 0,
            },
            requestedQuantity: originalQty,
            declinedQuantity: declinedQty,
            approvedQuantity: approvedQty,
            parentRequestId: request._id,
            description: 'Remainder declined as part of partial approval via technician dashboard',
          },
        })
        await declineLog.save({ session })

        processed.push({
          requestId: String(declinedRequest._id),
          status: 'declined',
          approvedQuantity: 0,
          declinedQuantity: declinedQty,
          parentRequestId: String(request._id),
        })
      }
    }

    await session.commitTransaction()

    return {
      success: true,
      message: 'Cart processed successfully',
      data: processed,
    }
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }

    console.error('Error processing technician cart:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to process cart',
    })
  } finally {
    session.endSession()
  }
})