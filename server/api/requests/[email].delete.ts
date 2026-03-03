import { defineEventHandler, getRouterParam, createError } from 'h3'
import mongoose from 'mongoose'
import Request from '~/server/models/Requests'
import Log from '~/server/models/Logs'
import Component from '~/server/models/Components'
import connectDB from '~/server/utils/db'
import { getCurrentUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await mongoose.startSession()
  
  try {
    await connectDB()

    // we are using email as parameter name to match file path this is  actually the request id
    const requestIdString = getRouterParam(event, 'email')

    if (!requestIdString) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Request ID is required'
      })
    }

    // Check if it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(requestIdString)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request ID format'
      })
    }

    // Get current user
    const currentUser = getCurrentUser(event)
    if (!currentUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - No user context'
      })
    }

    // Start transaction
    session.startTransaction()

    // Find the request with populated component details
    const request = await Request.findById(requestIdString)
      .populate('component_id')
      .session(session)
    
    if (!request) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Request not found'
      })
    }

    // Check if request is pending
    if (request.status !== 'pending') {
      throw createError({
        statusCode: 400,
        statusMessage: `Only pending requests can be cancelled. Current status: ${request.status}`
      })
    }

    // Check authorization
    const isOwner = request.user_id.toString() === currentUser.userId
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin'

    if (!isOwner && !isAdmin) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You are not authorized to delete this request'
      })
    }

    // Store request details for log before deletion
    const requestDetails = {
      id: request._id,
      userId: request.user_id,
      componentId: request.component_id?._id,
      componentModel: (request.component_id as any)?.model || 'Unknown',
      componentDescription: (request.component_id as any)?.description || '',
      quantity: request.available_quantity || request.quantity_requested,
      class: request.class,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    }

    // Delete the request
    await Request.findByIdAndDelete(requestIdString).session(session)

    // Create log entry
    const log = new Log({
      action: 'REQUEST_CANCEL', // or 'REQUEST_DELETE'
      userId: new mongoose.Types.ObjectId(currentUser.userId),
      userEmail: currentUser.email,
      userRole: currentUser.role,
      ip: event.headers.get('x-forwarded-for') || event.headers.get('x-real-ip'),
      userAgent: event.headers.get('user-agent'),
      metadata: {
        entityId: request._id,
        entityType: 'request',
        before: requestDetails,
        reason: isOwner ? 'User cancelled their request' : 'Admin cancelled request',
        requestDetails: {
          id: request._id,
          componentModel: requestDetails.componentModel,
          quantity: requestDetails.quantity,
          class: requestDetails.class,
          status: requestDetails.status
        },
        componentDetails: request.component_id ? {
          id: request.component_id._id,
          model: (request.component_id as any).model,
          description: (request.component_id as any).description
        } : undefined,
        userDetails: {
          id: currentUser.userId,
          email: currentUser.email,
          role: currentUser.role
        }
      }
    })

    await log.save({ session })

    // Commit transaction
    await session.commitTransaction()

    return {
      success: true,
      message: 'Request cancelled successfully',
      data: {
        id: requestIdString,
        deleted: true,
        logId: log._id
      }
    }
    
  } catch (error: any) {
    // Abort transaction on error
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    
    console.error('❌ Error deleting request:', error)
    
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to delete request'
    })
  } finally {
    session.endSession()
  }
})