import { defineEventHandler, getRouterParam, createError } from 'h3'
import Request from '~/server/models/Requests'
import User from '~/server/models/Users'
import connectDB from '~/server/utils/db'
import { getCurrentUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()
    
    // Get and decode email from URL parameter
    const encodedEmail = getRouterParam(event, 'email')
    
    if (!encodedEmail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email parameter is required'
      })
    }

    const requestedEmail = decodeURIComponent(encodedEmail)


    // Get current user from middleware
    const currentUser = getCurrentUser(event)
    
    if (!currentUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - No user context'
      })
    }

    // Verify email matches (case-insensitive)
    if (requestedEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - You can only view your own requests'
      })
    }

    // Find the user to get their ObjectId
    const user = await User.findOne({ email: requestedEmail.toLowerCase() })
    
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Find requests using populate
    const requests = await Request.find({ user_id: user._id })
      .populate({
        path: 'component_id',
        model: 'Component', // or 'Inventory' - check your model name
        select: 'model description link quantity'
      })
      .sort({ createdAt: -1 }) // Most recent first
      .lean() // Convert to plain JavaScript objects


    // Transform the data for frontend
    const transformedRequests = requests.map(request => ({
      id: request._id,
      // Request fields
      requested_quantity: request.quantity_requested,
      class: request.class,
      status: request.status,
      timestamp: request.createdAt,
      // Component fields (from populate)
      model: request.component_id?.model || 'Unknown',
      description: request.component_id?.description || '',
      link: request.component_id?.link || '',
      current_quantity: request.component_id?.quantity || 0
    }))

    return {
      success: true,
      data: transformedRequests,
      meta: {
        user: {
          email: user.email,
          id: user._id
        },
        total: transformedRequests.length
      }
    }

  } catch (error: any) {
    console.error('Error fetching user requests:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch requests'
    })
  }
})