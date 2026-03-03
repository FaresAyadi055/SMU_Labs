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

    // Get current user
    const currentUser = getCurrentUser(event)
    if (!currentUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Check permissions
    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Admin access required'
      })
    }

    // Read request body
    let body
    try {
      body = await readBody(event)
    } catch (bodyError) {
      console.error('Error reading body:', bodyError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid JSON body'
      })
    }

    if (!body || Object.keys(body).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No update data provided'
      })
    }

    const { 
      quantity, 
      location, 
      model, 
      description, 
      link,
      reason 
    } = body

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

    // Track changes
    const changes: any[] = []
    const before: any = {}
    const after: any = {}

    // Update fields
    if (quantity !== undefined) {
      if (quantity < 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Quantity cannot be negative'
        })
      }
      before.quantity = component.quantity
      component.quantity = quantity
      after.quantity = quantity
      changes.push({
        field: 'quantity',
        oldValue: before.quantity,
        newValue: quantity
      })
    }

    if (location !== undefined) {
      before.location = component.location
      component.location = location
      after.location = location
      changes.push({
        field: 'location',
        oldValue: before.location,
        newValue: location
      })
    }

    if (model !== undefined && model !== component.model) {
      before.model = component.model
      component.model = model
      after.model = model
      changes.push({
        field: 'model',
        oldValue: before.model,
        newValue: model
      })
    }

    if (description !== undefined && description !== component.description) {
      before.description = component.description
      component.description = description
      after.description = description
      changes.push({
        field: 'description',
        oldValue: before.description,
        newValue: description
      })
    }

    if (link !== undefined && link !== component.link) {
      before.link = component.link
      component.link = link
      after.link = link
      changes.push({
        field: 'link',
        oldValue: before.link,
        newValue: link
      })
    }

    // Save the component
    await component.save({ session })

    // Create log entry WITHOUT transactionId
    const log = new Log({
      action: 'INVENTORY_UPDATE',
      userId: new mongoose.Types.ObjectId(currentUser.userId),
      userEmail: currentUser.email,
      userRole: currentUser.role,
      ip: event.headers.get('x-forwarded-for') || event.headers.get('x-real-ip'),
      userAgent: event.headers.get('user-agent'),
      metadata: {
        entityId: component._id,
        entityType: 'component',
        before: Object.keys(before).length > 0 ? before : undefined,
        after: Object.keys(after).length > 0 ? after : undefined,
        changes: changes.length > 0 ? changes : undefined,
        quantity: quantity !== undefined ? {
          previous: before.quantity,
          new: quantity,
          change: quantity - (before.quantity || component.quantity)
        } : undefined,
        reason: reason || 'Inventory updated via admin panel',
        componentDetails: {
          model: component.model,
          description: component.description
        }
      }
      // No transactionId field - removed completely
    })

    await log.save({ session })

    // Commit transaction
    await session.commitTransaction()


    return {
      success: true,
      message: 'Component updated successfully',
      data: {
        component,
        changes,
        logId: log._id
      }
    }

  } catch (error: any) {
    // Abort transaction on error
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    
    console.error('❌ Error updating inventory:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update component'
    })
  } finally {
    session.endSession()
  }
})