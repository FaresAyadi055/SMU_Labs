import { defineEventHandler, readBody, createError } from 'h3'
import mongoose from 'mongoose'
import Request from '~/server/models/Requests'
import Component from '~/server/models/Components'
import Log from '~/server/models/Logs'
import connectDB from '~/server/utils/db'
import { requireRole } from '~/server/utils/auth'

console.log('return-item.post.ts - Unified return endpoint')

export default defineEventHandler(async (event) => {
  const session = await mongoose.startSession()

  try {
    await connectDB()

    // Only instructors and admins can mark returns
    const currentUser = requireRole(event, ['instructor', 'admin', 'superadmin'])

    let body: { requestIds?: string | string[] }
    try {
      body = await readBody(event)
    } catch (bodyError) {
      console.error('Error reading body in return-item:', bodyError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid JSON body',
      })
    }

    // Handle both single requestId and array of requestIds
    let requestIds: string[] = []
    
    if (body.requestIds) {
      if (Array.isArray(body.requestIds)) {
        requestIds = body.requestIds
      } else {
        requestIds = [body.requestIds as string]
      }
    }

    if (requestIds.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Valid requestId or requestIds array is required',
      })
    }

    // Validate all request IDs
    const invalidIds = requestIds.filter(id => !mongoose.Types.ObjectId.isValid(id))
    if (invalidIds.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid request IDs: ${invalidIds.join(', ')}`,
      })
    }

    // Start transaction
    session.startTransaction()

    // Fetch all requests with their components
    const requests = await Request.find({
      _id: { $in: requestIds.map(id => new mongoose.Types.ObjectId(id)) },
      status: 'approved' // Only fetch approved requests
    })
      .session(session)
      .populate('component_id', 'model description link quantity location manufacturer')

    if (requests.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No valid approved requests found',
      })
    }

    // Check if all requested IDs were found and are approved
    const foundIds = requests.map(r => r._id.toString())
    const missingIds = requestIds.filter(id => !foundIds.includes(id))
    
    if (missingIds.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Some requests are invalid or not approved: ${missingIds.join(', ')}`,
      })
    }

    const results = []
    const logs = []

    // Process each request
    for (const request of requests) {
      const component = request.component_id as any
      
      if (!component) {
        throw createError({
          statusCode: 404,
          statusMessage: `Component not found for request ${request._id}`,
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

      // Prepare individual log entry for each returned item
      logs.push({
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
          description: requestIds.length === 1 
            ? 'Item marked as returned' 
            : 'Item marked as returned via batch operation',
        },
      })

      results.push({
        requestId: String(request._id),
        componentId: String(component._id),
        componentModel: component.model,
        status: request.status,
        newStock: newQuantity,
        success: true,
      })
    }

    // Create all log entries
    if (logs.length > 0) {
      await Log.insertMany(logs, { session })
    }

    await session.commitTransaction()

    return {
      success: true,
      message: requestIds.length === 1 
        ? `Successfully returned ${results[0].componentModel}` 
        : `Successfully returned ${results.length} item(s)`,
      data: {
        returned: results,
        count: results.length,
        isBatch: requestIds.length > 1,
      },
    }
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }

    console.error('Error marking items as returned:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to mark items as returned',
    })
  } finally {
    session.endSession()
  }
})