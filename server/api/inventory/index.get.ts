import { defineEventHandler, getQuery, createError } from 'h3'
import Component from '~/server/models/Components'
import connectDB from '~/server/utils/db'
import { getCurrentUser, isAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()
    
    // Get current user from context (set by auth middleware)
    const user = getCurrentUser(event)
    
    const query = getQuery(event)
    const { 
      search, 
      location, 
      minQuantity, 
      maxQuantity,
      sortBy = 'model',
      sortOrder = 'asc',
      page = 1,
      limit = 400
    } = query

    // Build filter object
    const filter: any = {}

    // Search by model or description
    if (search) {
      filter.$or = [
        { model: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    // Filter by location
    if (location) {
      const locationValue = isNaN(Number(location)) ? location : Number(location)
      filter.location = locationValue
    }

    // Filter by quantity range
    if (minQuantity !== undefined || maxQuantity !== undefined) {
      filter.quantity = {}
      if (minQuantity !== undefined) filter.quantity.$gte = Number(minQuantity)
      if (maxQuantity !== undefined) filter.quantity.$lte = Number(maxQuantity)
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)
    
    // Build sort object
    const sort: any = {}
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1

    // Define projection based on user role
    // If user is admin/superadmin, return all fields
    // Otherwise return limited fields for students/instructors
    let projection = {}
    
    if (user && (user.role === 'superadmin' || user.role === 'admin')) {
      // Admin gets all fields
      projection = {} // Empty object means all fields
    } else {
      // Students and instructors get limited fields
      projection = {
        model: 1,
        description: 1,
        quantity: 1,
        link: 1
        // _id is always included by default, location, createdAt, updatedAt are excluded
      }
    }

    // Execute query with projection
    const [components, total] = await Promise.all([
      Component.find(filter, projection)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Component.countDocuments(filter)
    ])

    return {
      success: true,
      data: components,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      user: {
        role: user?.role || 'student',
        email: user?.email
      }
    }

  } catch (error: any) {
    console.error('Error fetching components:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch components'
    })
  }
})