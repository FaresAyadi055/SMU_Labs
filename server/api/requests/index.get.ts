import { defineEventHandler, getQuery, createError } from 'h3'
import mongoose from 'mongoose'
import Request from '~/server/models/Requests'
import User from '~/server/models/Users'
import connectDB from '~/server/utils/db'
import { getCurrentUser, isAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()
    
    // Verify user is admin
    const currentUser = isAdmin(event)

    const query = getQuery(event)
    const {
      status,
      search,
      page = 1,
      limit = 50
    } = query

    // Build filter
    const filter: any = {}
    if (status) filter.status = status

    // First, get all users with their requests
    const users = await User.find().lean()
    
    // For each user, get their requests
    const userRequests = await Promise.all(
      users.map(async (user) => {
        const userFilter = { ...filter, user_id: user._id }
        
        if (search) {
          // If search is provided, we need to filter by component model too
          const components = await Component.find({
            $or: [
              { model: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
            ]
          }).select('_id')
          
          const componentIds = components.map(c => c._id)
          userFilter.component_id = { $in: componentIds }
        }

        const requests = await Request.find(userFilter)
          .populate('component_id', 'model description link quantity')
          .sort({ createdAt: -1 })
          .lean()

        if (requests.length === 0 && !search) {
          return null // Only return users with requests when no search
        }

        if (requests.length === 0 && search) {
          return null // Skip if search doesn't match
        }

        // Calculate stats
        const stats = {
          total: requests.length,
          pending: requests.filter(r => r.status === 'pending').length,
          approved: requests.filter(r => r.status === 'approved').length,
          declined: requests.filter(r => r.status === 'declined').length,
          returned: requests.filter(r => r.status === 'returned').length
        }

        // Find most recent pending request
        const pendingRequests = requests.filter(r => r.status === 'pending')
        const mostRecentPending = pendingRequests.length > 0
          ? new Date(Math.max(...pendingRequests.map(r => new Date(r.createdAt).getTime())))
          : null

        return {
          user: {
            id: user._id,
            email: user.email,
            role: user.role
          },
          stats,
          mostRecentPending,
          requests: requests.map(r => ({
            id: r._id,
            component: r.component_id ? {
              id: r.component_id._id,
              model: r.component_id.model,
              description: r.component_id.description,
              link: r.component_id.link
            } : null,
            quantity: r.available_quantity || r.quantity_requested,
            class: r.class,
            status: r.status,
            createdAt: r.createdAt
          }))
        }
      })
    )

    // Filter out nulls and sort by most recent pending
    let filteredResults = userRequests.filter(r => r !== null)
    
    // Sort by most recent pending (nulls last)
    filteredResults.sort((a, b) => {
      if (!a.mostRecentPending && !b.mostRecentPending) return 0
      if (!a.mostRecentPending) return 1
      if (!b.mostRecentPending) return -1
      return b.mostRecentPending.getTime() - a.mostRecentPending.getTime()
    })

    // Paginate
    const start = (Number(page) - 1) * Number(limit)
    const paginatedResults = filteredResults.slice(start, start + Number(limit))

    return {
      success: true,
      data: paginatedResults,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filteredResults.length,
        pages: Math.ceil(filteredResults.length / Number(limit))
      }
    }

  } catch (error: any) {
    console.error('Error fetching all requests:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch requests'
    })
  }
})