// server/api/auth/login.ts
import { defineEventHandler, readBody, createError } from 'h3'
import User from '~/server/models/Users'
import connectDB from '~/server/utils/db'
import { rateLimit } from '~/server/utils/rateLimit'

export default defineEventHandler(async (event) => {
  try {
    // Apply rate limit: 10 requests per 15 minutes per IP
    await rateLimit(event, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
      keyPrefix: 'login'
    })

    const body = await readBody(event)
    const { email } = body

    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email is required'
      })
    }

    // Validate email domain
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(medtech|smu)\.tn$/i
    if (!emailRegex.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Only @medtech.tn or @smu.tn emails are allowed'
      })
    }

    await connectDB()

    // Find or create user
    let user = await User.findOne({ email })
    if (!user) {
      user = await User.create({
        email,
        role: 'student'
        // Removed magicIssuer field
      })
    }

    return {
      success: true,
      message: 'User verified',
      data: {
        email: user.email,
        role: user.role
      }
    }

  } catch (error: any) {
    console.error('Login error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})