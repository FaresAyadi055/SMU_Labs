import { defineEventHandler, readBody, createError } from 'h3'
import mongoose from 'mongoose'
import Request from '~/server/models/Requests'
import Component from '~/server/models/Components'
import Log from '~/server/models/Logs'
import connectDB from '~/server/utils/db'
import { requireRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await mongoose.startSession()

  try {
    await connectDB()

    // Only technicians and admins can mark returns
    const currentUser = requireRole(event, ['instructor', 'admin', 'superadmin'])

    let body: { requestId?: string }
    try {
      body = await readBody(event)
    } catch (bodyError) {
      console.error('Error reading body in return-item:', bodyError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid JSON body',
      })
    }

    if (!body.requestId || !mongoose.Types.ObjectId.isValid(body.requestId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Valid requestId is required',
      })
    }

    // Start transaction
    session.startTransaction()

    const request = await Request.findById(body.requestId)
      .session(session)
      .populate('component_id', 'model description link quantity')

    if (!request) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Request not found',
      })
    }

    if (request.status !== 'approved') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Only approved requests can be marked as returned',
      })
    }

    const component = request.component_id as any

    if (!component) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Component not found for this request',
      })
    }

    const previousQuantity = component.quantity
    const returnQuantity = request.quantity_requested
    const newQuantity = previousQuantity + returnQuantity

    // Increment inventory
    component.quantity = newQuantity
    await component.save({ session })

    // Update request status
    request.status = 'returned'
    await request.save({ session })

    // Create log entry
    const log = new Log({
      action: 'REQUEST_RETURN',
      userId: new mongoose.Types.ObjectId(currentUser.userId),
      userEmail: currentUser.email,
      userRole: currentUser.role,
      metadata: {
        entityId: request._id,
        entityType: 'request',
        requestStatus: 'returned',
        itemId: component._id,
        itemModel: component.model,
        quantity: {
          previous: previousQuantity,
          new: newQuantity,
          change: returnQuantity,
        },
        returnedQuantity: returnQuantity,
        description:
          'Item marked as returned; inventory incremented via returns interface',
      },
    })

    await log.save({ session })

    await session.commitTransaction()

    return {
      success: true,
      message: 'Item marked as returned',
      data: {
        requestId: String(request._id),
        componentId: String(component._id),
        status: request.status,
        newStock: newQuantity,
      },
    }
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }

    console.error('Error marking item as returned:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to mark item as returned',
    })
  } finally {
    session.endSession()
  }
})

