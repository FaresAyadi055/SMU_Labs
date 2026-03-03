import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import mongoose from 'mongoose'
import User from '~/server/models/Users'
import Log from '~/server/models/Logs'
import connectDB from '~/server/utils/db'
import { isAdmin } from '~/server/utils/auth'

const emailRegex = /^[a-zA-Z0-9._%+-]+@(medtech|smu)\.tn$/i

export default defineEventHandler(async (event) => {
  try {
    await connectDB()
    const currentUser = isAdmin(event)

    const id = getRouterParam(event, 'id')
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid admin ID' })
    }

    let body: { email?: string; role?: string }
    try {
      body = await readBody(event)
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Invalid JSON body' })
    }

    const user = await User.findById(id)
    if (!user) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw createError({ statusCode: 400, statusMessage: 'User is not an administrator' })
    }

    const updates: string[] = []
    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase()
      if (!emailRegex.test(email)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Only @medtech.tn or @smu.tn emails are allowed',
        })
      }
      const existing = await User.findOne({ email, _id: { $ne: id } })
      if (existing) {
        throw createError({ statusCode: 409, statusMessage: 'Email already in use' })
      }
      user.email = email
      updates.push('email')
    }
    if (body.role !== undefined && (body.role === 'admin' || body.role === 'superadmin')) {
      user.role = body.role
      updates.push('role')
    }

    if (updates.length === 0) {
      return {
        success: true,
        message: 'No changes',
        data: { id: String(user._id), email: user.email, role: user.role },
      }
    }

    await user.save()

    const log = new Log({
      action: 'USER_UPDATE',
      userId: new mongoose.Types.ObjectId(currentUser.userId),
      userEmail: currentUser.email,
      userRole: currentUser.role,
      metadata: {
        entityId: user._id,
        entityType: 'user',
        after: { email: user.email, role: user.role },
        description: `Admin updated: ${updates.join(', ')}`,
      },
    })
    await log.save()

    return {
      success: true,
      message: 'Admin updated',
      data: { id: String(user._id), email: user.email, role: user.role },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update admin',
    })
  }
})
