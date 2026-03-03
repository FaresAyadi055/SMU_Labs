import { defineEventHandler, readBody, createError } from 'h3'
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

    let body: { email?: string }
    try {
      body = await readBody(event)
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Invalid JSON body' })
    }

    const email = body.email?.trim()?.toLowerCase()
    if (!email) {
      throw createError({ statusCode: 400, statusMessage: 'Email is required' })
    }
    if (!emailRegex.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Only @medtech.tn or @smu.tn emails are allowed',
      })
    }

    let user = await User.findOne({ email })
    const isNew = !user

    if (!user) {
      user = await User.create({ email, role: 'admin' })
    } else if (user.role === 'admin' || user.role === 'superadmin') {
      throw createError({
        statusCode: 409,
        statusMessage: 'User is already an administrator',
      })
    } else {
      user.role = 'admin'
      await user.save()
    }

    const log = new Log({
      action: isNew ? 'USER_CREATE' : 'USER_UPDATE',
      userId: new mongoose.Types.ObjectId(currentUser.userId),
      userEmail: currentUser.email,
      userRole: currentUser.role,
      metadata: {
        entityId: user._id,
        entityType: 'user',
        after: { email: user.email, role: user.role },
        description: `Admin added: ${email}`,
      },
    })
    await log.save()

    return {
      success: true,
      message: isNew ? 'Admin created' : 'User promoted to admin',
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
      statusMessage: error.message || 'Failed to add admin',
    })
  }
})
