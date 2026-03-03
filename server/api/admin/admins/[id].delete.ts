import { defineEventHandler, getRouterParam, createError } from 'h3'
import mongoose from 'mongoose'
import User from '~/server/models/Users'
import Log from '~/server/models/Logs'
import connectDB from '~/server/utils/db'
import { isAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()
    const currentUser = isAdmin(event)

    const id = getRouterParam(event, 'id')
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid admin ID' })
    }

    if (id === currentUser.userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'You cannot remove your own admin role',
      })
    }

    const user = await User.findById(id)
    if (!user) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw createError({ statusCode: 400, statusMessage: 'User is not an administrator' })
    }

    const previousRole = user.role
    user.role = 'student'
    await user.save()

    const log = new Log({
      action: 'USER_UPDATE',
      userId: new mongoose.Types.ObjectId(currentUser.userId),
      userEmail: currentUser.email,
      userRole: currentUser.role,
      metadata: {
        entityId: user._id,
        entityType: 'user',
        before: { email: user.email, role: previousRole },
        after: { email: user.email, role: 'student' },
        description: `Admin removed: ${user.email}`,
      },
    })
    await log.save()

    return {
      success: true,
      message: 'Admin removed',
      data: { id: String(user._id), email: user.email, role: user.role },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to remove admin',
    })
  }
})
