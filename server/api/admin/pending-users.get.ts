import { defineEventHandler, createError } from 'h3'
import mongoose from 'mongoose'
import Request from '~/server/models/Requests'
import User from '~/server/models/Users'
import Component from '~/server/models/Components'
import connectDB from '~/server/utils/db'
import { requireRole, UserRole } from '~/server/utils/auth'
import '~/server/models/Users'
import '~/server/models/Requests'
import '~/server/models/Components'
type PendingUserItem = {
  id: string
  email: string
  role: UserRole | string
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

    // Only technicians (instructors) and admins can see pending users
    requireRole(event, ['instructor', 'admin', 'superadmin'])

    // Find all pending requests, with user and component populated
    const pendingRequests = await Request.find({ status: 'pending' })
      .populate('user_id', 'email role')
      // populate full component to avoid projection issues with location
      .populate('component_id')
      .sort({ createdAt: 1 }) // oldest first to simplify oldestPendingAt calculation
      .lean()

    if (!pendingRequests.length) {
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
        // Skip requests without a valid user (should not normally happen)
        continue
      }

      const userId = String(user._id)
      const createdAt = req.createdAt ? new Date(req.createdAt) : new Date()

      if (!grouped.has(userId)) {
        grouped.set(userId, {
          id: userId,
          email: user.email,
          role: user.role as UserRole | string,
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

    // Also fetch declined requests for these users to show in the dashboard,
    // but do not change pending counters or sorting semantics.
    const userIds = Array.from(grouped.keys()).map(
      (id) => new mongoose.Types.ObjectId(id),
    )

    if (userIds.length > 0) {
      const declinedRequests = await Request.find({
        user_id: { $in: userIds },
        status: 'declined',
      })
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
        if (!group) continue // only attach to users that already have pending

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
    }
  } catch (error: any) {
    console.error('Error fetching pending users:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch pending users',
    })
  }
})

