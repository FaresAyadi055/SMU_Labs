import { defineEventHandler, getRouterParam, createError } from 'h3'
import mongoose from 'mongoose'
import User from '~/server/models/Users'
import connectDB from '~/server/utils/db'
import { isSuperAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()
    isSuperAdmin(event)

    const id = getRouterParam(event, 'id')
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })
    }

    const user = await User.findById(id).select('email role assignedClasses')
    if (!user) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    if (user.role !== 'instructor') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Classes can only be fetched for users with the instructor role',
      })
    }

    return {
      success: true,
      data: {
        id: String(user._id),
        email: user.email,
        role: user.role,
        assignedClasses: user.assignedClasses ?? [],
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch assigned classes',
    })
  }
})