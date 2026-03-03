import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import mongoose from 'mongoose'
import Component from '~/server/models/Components'
import Log from '~/server/models/Logs'
import connectDB from '~/server/utils/db'
import { getCurrentUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await mongoose.startSession()
  
  try {
    await connectDB()
    
    // Get component ID from URL
    const componentId = getRouterParam(event, 'id')
    
    if (!componentId || !mongoose.Types.ObjectId.isValid(componentId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid component ID'
      })
    }

    // Get current user and verify admin permissions
    const currentUser = getCurrentUser(event)
    if (!currentUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Check if user is admin or superadmin
    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Admin access required'
      })
    }

    // 🔥 FIX: Safely read request body (it might be empty)
    let reason = 'Component deleted via admin panel'
    try {
      const body = await readBody(event)
      
      // Only extract reason if body exists and has reason property
      if (body && body.reason) {
        reason = body.reason
      }
    } catch (bodyError) {
      // If there's no body or it's invalid, just use default reason
      console.log('No body provided or invalid JSON, using default reason')
    }

    // Start transaction
    session.startTransaction()

    // Find the component
    const component = await Component.findById(componentId).session(session)
    
    if (!component) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Component not found'
      })
    }

    // Store component details for log before deletion
    const componentDetails = {
      id: component._id,
      model: component.model,
      description: component.description,
      quantity: component.quantity,
      location: component.location,
      link: component.link,
      createdAt: component.createdAt,
      updatedAt: component.updatedAt
    }

    // Delete the component
    await Component.findByIdAndDelete(componentId).session(session)

    // Create log entry
    const log = new Log({
      action: 'INVENTORY_DELETE',
      userId: new mongoose.Types.ObjectId(currentUser.userId),
      userEmail: currentUser.email,
      userRole: currentUser.role,
      ip: event.headers.get('x-forwarded-for') || event.headers.get('x-real-ip'),
      userAgent: event.headers.get('user-agent'),
      metadata: {
        entityId: component._id,
        entityType: 'component',
        before: componentDetails,
        reason: reason,
        componentDetails: {
          model: component.model,
          description: component.description
        }
      }
    })

    await log.save({ session })

    // Commit transaction
    await session.commitTransaction()


    return {
      success: true,
      message: 'Component deleted successfully',
      data: {
        deletedComponent: componentDetails,
        logId: log._id
      }
    }

  } catch (error: any) {
    // Abort transaction on error
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    
    console.error('❌ Error deleting component:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to delete component'
    })
  } finally {
    session.endSession()
  }
})