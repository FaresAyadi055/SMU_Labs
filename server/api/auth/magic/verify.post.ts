// api/auth/magic/verify.ts
import { defineEventHandler, readBody, createError } from 'h3'
import jwt from 'jsonwebtoken'
import User from '~/server/models/Users'
import connectDB from '~/server/utils/db'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
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
    const secretKey = process.env.MAGIC_SECRET_KEY || config.MAGIC_SECRET_KEY
    if (!secretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Magic SDK not configured - missing secret key'
      })
    }

    // LAST RESORT: Use require with createRequire
    let Magic
    try {
      // This works in both ESM and CommonJS environments
      const magicAdmin = require('@magic-sdk/admin')
      Magic = magicAdmin.Magic || magicAdmin
      
      console.log('Magic SDK loaded successfully via require')
    } catch (requireError) {
      console.error('Failed to load Magic SDK via require:', requireError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Authentication service unavailable - SDK load failed'
      })
    }

    // Validate that Magic was properly imported
    if (!Magic || typeof Magic !== 'function') {
      console.error('Magic constructor not found or invalid')
      throw createError({
        statusCode: 500,
        statusMessage: 'Authentication service unavailable - invalid SDK'
      })
    }

    // Initialize Magic
    const magic = new Magic(secretKey)
    
    // Validate the DID token with Magic
    let magicUserMetadata
    try {
      // Verify the token is valid
      magic.token.validate(didToken)
      
      // Get user metadata from Magic
      magicUserMetadata = await magic.users.getMetadataByToken(didToken)
    } catch (magicError: any) {
      console.error('Magic token validation error:', magicError)
      
      // Handle specific Magic errors
      if (magicError.message?.includes('expired')) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Token has expired'
        })
      }
      
      if (magicError.message?.includes('invalid')) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Invalid token'
        })
      }
      
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication failed'
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
      console.log(`User not found: ${email}, creating new user`)
      user = await User.create({
        email,
        role: 'student',
        magicIssuer: issuer // Store Magic issuer for future reference
      })
      console.log(`New user created: ${email}`)
    } else {
      // Update Magic issuer if not set
      if (!user.magicIssuer && issuer) {
        user.magicIssuer = issuer
        await user.save()
        console.log(`Updated Magic issuer for: ${email}`)
      }
    }

    // Generate JWT token for your app
    const jwtSecret = process.env.JWT_SECRET || config.JWT_SECRET
    if (!jwtSecret) {
      throw createError({
        statusCode: 500,
        statusMessage: 'JWT secret not configured'
      })
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      },
      jwtSecret,
      { expiresIn: '7d' }
    )
    
    // Return user data and token
    return {
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      }
    }
    
  } catch (error: any) {
    console.error('Magic verification error:', error)

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid user data',
        data: error.errors
      })
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      throw createError({
        statusCode: 409,
        statusMessage: 'User already exists'
      })
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      throw createError({
        statusCode: 500,
        statusMessage: 'Token generation failed'
      })
    }

    // Re-throw if it's already a createError
    if (error.statusCode) {
      throw error
    }

    // Default error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})