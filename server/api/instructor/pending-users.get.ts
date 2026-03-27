// api/instructor/pending-users.get.ts
import { defineEventHandler, createError } from 'h3'
import mongoose from 'mongoose'
import Request from '~/server/models/Requests'
import User from '~/server/models/Users'
import Component from '~/server/models/Components'
import connectDB from '~/server/utils/db'
import { requireRole, getCurrentUser, UserRole } from '~/server/utils/auth'
import '~/server/models/Users'
import '~/server/models/Requests'
import '~/server/models/Components'

type PendingUserItem = {
  id: string
  email: string
  role: string
  oldestPendingAt: string | null
  totalPending: number
  requests: {
    id: string
    component: {
      id: string
      model: string
      description: string
      link: string
      quantityInStock: number
      location: string | number
    } | null
    quantityRequested: number
    class: string
    status: string
    createdAt: string
  }[]
}

export default defineEventHandler(async (event) => {
  try {
    await connectDB()

    // Check if user is authenticated and has required role
    const authUser = getCurrentUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      })
    }

    // Verify role
    if (!['instructor', 'admin', 'superadmin'].includes(authUser.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Insufficient permissions',
      })
    }

    // Fetch the full user from database to get all fields including assignedClasses
    const currentUser = await User.findById(authUser.userId || authUser._id)
    if (!currentUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found',
      })
    }
    
    // Get the instructor's assigned classes
    const assignedClasses = currentUser.assignedClasses || []
    
    // If the user is an instructor but has no assigned classes, return empty result
    if (currentUser.role === 'instructor' && assignedClasses.length === 0) {
      console.log('Instructor has no assigned classes, returning empty')
      return {
        success: true,
        data: [] as PendingUserItem[],
        message: 'No classes assigned to this instructor',
      }
    }

    // First, let's check all pending requests without filtering to see what exists
    const allPendingRequests = await Request.find({ status: 'pending' })
      .lean()

    // Build the filter for requests
    const requestFilter: any = { status: 'pending' }
    
    if (currentUser.role === 'instructor') {
      requestFilter.class = { $in: assignedClasses }
    } else {
      console.log('Admin/superadmin - no class filter applied')
    }

    // Find all pending and verified requests with filters applied
    const pendingRequests = await Request.find(requestFilter)
      .populate('user_id', 'email role assignedClasses')
      .populate('component_id')
      .sort({ createdAt: 1 })
      .lean()
    

    if (!pendingRequests.length) {
      console.log('No pending requests found after filtering')
      
      
      return {
        success: true,
        data: [] as PendingUserItem[],
      }
    }

    // Group by user
    const grouped = new Map<string, PendingUserItem>()

    for (const req of pendingRequests as any[]) {
      const user = req.user_id as typeof User & {
        _id: mongoose.Types.ObjectId
        email: string
        role: string
      }

      if (!user) {
        console.log('Request has no user:', req._id)
        continue
      }

      const userId = String(user._id)
      const createdAt = req.createdAt ? new Date(req.createdAt) : new Date()

      if (!grouped.has(userId)) {
        grouped.set(userId, {
          id: userId,
          email: user.email,
          role: user.role,
          oldestPendingAt: createdAt.toISOString(),
          totalPending: 0,
          requests: [],
        })
      }

      const group = grouped.get(userId)!

      // Update oldestPendingAt
      if (
        group.oldestPendingAt &&
        createdAt.getTime() < new Date(group.oldestPendingAt).getTime()
      ) {
        group.oldestPendingAt = createdAt.toISOString()
      }

      group.totalPending += 1

      const component = req.component_id as any

      group.requests.push({
        id: String(req._id),
        component: component
          ? {
              id: String(component._id),
              model: component.model,
              description: component.description,
              link: component.link,
              quantityInStock: component.quantity,
              location: component.location,
            }
          : null,
        quantityRequested: req.quantity_requested,
        class: req.class,
        status: req.status,
        createdAt: createdAt.toISOString(),
      })
    }


    // Also fetch declined requests for these users to show in the dashboard
    const userIds = Array.from(grouped.keys()).map(
      (id) => new mongoose.Types.ObjectId(id),
    )

    if (userIds.length > 0) {
      const declinedFilter: any = {
        user_id: { $in: userIds },
        status: 'declined',
      }
      
      // Apply class filter for declined requests as well
      if (currentUser.role === 'instructor') {
        declinedFilter.class = { $in: assignedClasses }
      }
      
      const declinedRequests = await Request.find(declinedFilter)
        .populate('user_id', 'email role')
        .populate('component_id')
        .sort({ createdAt: 1 })
        .lean()


      for (const req of declinedRequests as any[]) {
        const user = req.user_id as typeof User & {
          _id: mongoose.Types.ObjectId
          email: string
          role: string
        }
        if (!user) continue

        const userId = String(user._id)
        const group = grouped.get(userId)
        if (!group) continue

        const createdAt = req.createdAt ? new Date(req.createdAt) : new Date()  
        const component = req.component_id as any

        group.requests.push({
          id: String(req._id),
          component: component
            ? {
                id: String(component._id),
                model: component.model,
                description: component.description,
                link: component.link,
                quantityInStock: component.quantity,
                location: component.location,
              }
            : null,
          quantityRequested: req.quantity_requested,
          class: req.class,
          status: req.status,
          createdAt: createdAt.toISOString(),
        })
      }
    }

    // Convert to array and sort by oldestPendingAt ascending (oldest first)
    const result = Array.from(grouped.values()).sort((a, b) => {
      if (!a.oldestPendingAt && !b.oldestPendingAt) return 0
      if (!a.oldestPendingAt) return 1
      if (!b.oldestPendingAt) return -1
      return (
        new Date(a.oldestPendingAt).getTime() -
        new Date(b.oldestPendingAt).getTime()
      )
    })

    return {
      success: true,
      data: result,
      debug: {
        totalPendingInSystem: allPendingRequests.length,
        filteredCount: pendingRequests.length,
        userGroupsCount: grouped.size,
        assignedClassesFromDB: assignedClasses,
        ...(currentUser.role === 'instructor' && {
          assignedClasses: assignedClasses,
          classCount: assignedClasses.length,
          classesWithRequests: [...new Set(allPendingRequests.map(r => r.class))]
        }),
      },
      ...(currentUser.role === 'instructor' && {
        instructorInfo: {
          assignedClasses: assignedClasses,
          classCount: assignedClasses.length,
        }
      }),
    }
  } catch (error: any) {
    console.error('Error fetching instructor pending users:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch pending users for instructor',
    })
  }
})