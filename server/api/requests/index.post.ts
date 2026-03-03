// server/api/requests/index.post.ts 
import { defineEventHandler, readBody, createError } from 'h3'
import mongoose from 'mongoose'
import Request from '~/server/models/Requests'
import Component from '~/server/models/Components'
import connectDB from '~/server/utils/db'
import { getCurrentUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()
    
    // Get current user from middleware
    const currentUser = getCurrentUser(event)
    if (!currentUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - No user context'
      })
    }

    // Read request body
    const body = await readBody(event)
    const { 
      model_id, 
      student_email, 
      class_name, 
      quantity 
    } = body

    // Validate required fields
    if (!model_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Component ID is required'
      })
    }

    if (!student_email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Student email is required'
      })
    }

    if (!class_name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Class name is required'
      })
    }

    if (!quantity || quantity <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Valid quantity is required'
      })
    }

    // Verify that the student_email matches the current user's email
    if (student_email.toLowerCase() !== currentUser.email.toLowerCase()) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - You can only create requests for yourself'
      })
    }

    // Find the component to check availability
    const component = await Component.findById(model_id)
    
    if (!component) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Component not found'
      })
    }

    // Check if user already has a pending request for this component
    const existingRequest = await Request.findOne({
      user_id: currentUser.userId, // Use ID from middleware directly
      component_id: model_id,
      status: 'pending'
    })

    if (existingRequest) {
      throw createError({
        statusCode: 400,
        statusMessage: 'You already have a pending request for this component'
      })
    }

    // Create the request using the user ID from middleware
    const newRequest = new Request({
      user_id: new mongoose.Types.ObjectId(currentUser.userId),
      component_id: model_id,
      quantity_requested: quantity,
      class: class_name,
      status: 'pending'
    })

    // Save to database
    const savedRequest = await newRequest.save()

    // Populate the component details
    await savedRequest.populate({
      path: 'component_id',
      select: 'model description link quantity'
    })

    return {
      success: true,
      message: 'Request created successfully',
      data: {
        id: savedRequest._id,
        component: savedRequest.component_id ? {
          id: savedRequest.component_id._id,
          model: savedRequest.component_id.model,
          description: savedRequest.component_id.description,
          link: savedRequest.component_id.link,
          availableQuantity: savedRequest.component_id.quantity
        } : null,
        quantity: savedRequest.available_quantity,
        class: savedRequest.class,
        status: savedRequest.status,
        createdAt: savedRequest.createdAt,
        user: {
          email: currentUser.email,
          id: currentUser.userId
        }
      }
    }

  } catch (error: any) {
    console.error('Error creating request:', error)

    if (error.name === 'ValidationError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation error',
        data: error.errors
      })
    }

    if (error.code === 11000) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Duplicate request detected'
      })
    }

    if (error.name === 'CastError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid ID format'
      })
    }

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create request'
    })
  }
})