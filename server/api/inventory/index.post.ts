import { defineEventHandler, readBody, createError } from 'h3'
import mongoose from 'mongoose'
import Component from '~/server/models/Components'
import Log from '~/server/models/Logs'
import connectDB from '~/server/utils/db'
import { getCurrentUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await mongoose.startSession()
  
  try {
    await connectDB()
    
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

    const { 
      model, 
      description, 
      quantity, 
      location, 
      link,
      reason 
    } = body

    // Validate required fields
    if (!model) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Model is required'
      })
    }

    if (quantity === undefined || quantity < 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Valid quantity is required'
      })
    }

    // Start transaction
    session.startTransaction()

    // Check if component with same model already exists
    const existingComponent = await Component.findOne({ model }).session(session)
    if (existingComponent) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Component with this model already exists'
      })
    }

    // Create new component
    const newComponent = new Component({
      model,
      description: description || '',
      quantity,
      location: location || 'Unassigned',
      link: link || ''
    })

    await newComponent.save({ session })

    // Create log entry
    const log = new Log({
      action: 'INVENTORY_CREATE',
      userId: new mongoose.Types.ObjectId(currentUser.userId),
      userEmail: currentUser.email,
      userRole: currentUser.role,
      ip: event.headers.get('x-forwarded-for') || event.headers.get('x-real-ip'),
      userAgent: event.headers.get('user-agent'),
      metadata: {
        entityId: newComponent._id,
        entityType: 'component',
        after: {
          model: newComponent.model,
          description: newComponent.description,
          quantity: newComponent.quantity,
          location: newComponent.location,
          link: newComponent.link
        },
        reason: reason || 'Component created via admin panel',
        componentDetails: {
          model: newComponent.model,
          description: newComponent.description
        }
      }
    })

    await log.save({ session })

    // Commit transaction
    await session.commitTransaction()

    return {
      success: true,
      message: 'Component created successfully',
      data: {
        component: newComponent,
        logId: log._id
      }
    }

  } catch (error: any) {
    // Abort transaction on error
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    
    console.error('❌ Error creating component:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create component'
    })
  } finally {
    session.endSession()
  }
})