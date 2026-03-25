import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import mongoose from 'mongoose'
import User from '~/server/models/Users'
import Log from '~/server/models/Logs'
import connectDB from '~/server/utils/db'
import { isSuperAdmin } from '~/server/utils/auth'

type UserRole = 'superadmin' | 'admin' | 'instructor' | 'student'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()
    const currentUser = isSuperAdmin(event)

    const id = getRouterParam(event, 'id')
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })
    }

    let body: { role?: UserRole }
    try {
      body = await readBody(event)
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Invalid JSON body' })
    }

    if (!body.role) {
      throw createError({ statusCode: 400, statusMessage: 'Role is required' })
    }

    const allowedRoles: UserRole[] = ['superadmin', 'admin', 'instructor', 'student']
    if (!allowedRoles.includes(body.role)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid role value' })
    }

    const user = await User.findById(id)
    if (!user) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    const previousRole = user.role
    user.role = body.role
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
        after: { email: user.email, role: user.role },
        description: `User role changed from ${previousRole} to ${user.role}`,
      },
    })
    await log.save()

    return {
      success: true,
      message: 'User updated',
      data: {
        id: String(user._id),
        email: user.email,
        role: user.role,
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update user',
    })
  }
})

