import { defineEventHandler, getQuery, createError } from 'h3'
import mongoose from 'mongoose'
import Request from '~/server/models/Requests'
import User from '~/server/models/Users'
import Component from '~/server/models/Components'
import connectDB from '~/server/utils/db'
import { requireRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()

    // Only technicians and admins can see active loans
    requireRole(event, ['instructor', 'admin', 'superadmin'])

    const query = getQuery(event)
    const { search } = query

    // Base filter: approved and not returned yet
    const filter: any = { status: 'approved' }

    let componentIds: mongoose.Types.ObjectId[] | undefined

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search, 'i')

      // Search users by email
      const users = await User.find({
        email: { $regex: searchRegex },
      })
        .select('_id')
        .lean()

      const userIds = users.map((u) => u._id)

      // Search components by model/description
      const components = await Component.find({
        $or: [
          { model: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
        ],
      })
        .select('_id')
        .lean()

      componentIds = components.map((c) => c._id)

      if (userIds.length || componentIds.length) {
        filter.$or = []
        if (userIds.length) {
          filter.$or.push({ user_id: { $in: userIds } })
        }
        if (componentIds.length) {
          filter.$or.push({ component_id: { $in: componentIds } })
        }
      }
    }

    const requests = await Request.find(filter)
      .populate('user_id', 'email role')
      .populate('component_id', 'model description link quantity location')
      .sort({ createdAt: -1 })
      .lean()

    const data = requests.map((req: any) => ({
      id: String(req._id),
      user: req.user_id
        ? {
            id: String(req.user_id._id),
            email: req.user_id.email,
            role: req.user_id.role,
          }
        : null,
      component: req.component_id
        ? {
            id: String(req.component_id._id),
            model: req.component_id.model,
            description: req.component_id.description,
            link: req.component_id.link,
            currentStock: req.component_id.quantity,
            location: req.component_id.location
          }
        : null,
      quantityBorrowed: req.quantity_requested,
      class: req.class,
      status: req.status,
      borrowedAt: req.createdAt ? new Date(req.createdAt).toISOString() : null,
    }))

    return {
      success: true,
      data,
      meta: {
        total: data.length,
      },
    }
  } catch (error: any) {
    console.error('Error fetching active loans:', error)

    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch active loans',
    })
  }
})

