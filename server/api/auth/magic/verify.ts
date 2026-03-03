// api/auth/magic/verify.ts
import { defineEventHandler, readBody, createError } from 'h3'
import jwt from 'jsonwebtoken'
import User from '~/server/models/Users'
import connectDB from '~/server/utils/db'

const config = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  try {
    // Read request body
    const body = await readBody(event)
    const { didToken } = body

    // Validate DID token
    if (!didToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'DID token is required'
      })
    }

    // Validate Magic is configured
    if (!process.env.MAGIC_SECRET_KEY && !config.MAGIC_SECRET_KEY) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Magic SDK not configured'
      })
    }

    // DYNAMIC IMPORT: Load Magic Admin only when needed
    const { Magic } = await import('@magic-sdk/admin')
    
    // Initialize Magic with your secret key
    const magic = new Magic(process.env.MAGIC_SECRET_KEY || config.MAGIC_SECRET_KEY)
    
    let magicUserMetadata
    try {
      // Validate the token and get user metadata
      magic.token.validate(didToken)
      magicUserMetadata = await magic.users.getMetadataByToken(didToken)
    } catch (magicError) {
      console.error('Magic token validation error:', magicError)
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired token'
      })
    }

    const { email, issuer } = magicUserMetadata

    // Validate email exists
    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email not found in token'
      })
    }

    // Validate email domain
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(medtech|smu)\.tn$/i
    if (!emailRegex.test(email)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only @medtech.tn or @smu.tn emails are allowed'
      })
    }

    // Connect to database
    await connectDB()

    // Find or create user
    let user = await User.findOne({ email })
    if (!user) {
      // Create new user with student role by default
      console.log(`User not found: ${email}`)
      user = await User.create({
        email,
        role: 'student',
        magicIssuer: issuer // Store the Magic issuer for future reference
      })
      console.log(`New user created: ${email}`)
    } else {
      // Update the Magic issuer if it's not set
      if (!user.magicIssuer && issuer) {
        user.magicIssuer = issuer
        await user.save()
      }
    }

    // Generate JWT token for your app
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || config.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )
    
    // Return user data and token
    return {
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      }
    }
  } catch (error: any) {
    console.error('Magic verification error:', error)

    // Handle mongoose errors
    if (error.name === 'ValidationError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid user data',
        data: error.errors
      })
    }

    if (error.code === 11000) {
      throw createError({
        statusCode: 409,
        statusMessage: 'User already exists'
      })
    }

    // Re-throw if it's already a createError
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})