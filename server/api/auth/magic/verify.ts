// api/auth/magic/verify.ts
import { defineEventHandler, readBody, createError } from 'h3'
import jwt from 'jsonwebtoken'
import User from '~/server/models/Users'
import connectDB from '~/server/utils/db'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const config = useRuntimeConfig()

// Helper function to properly extract Magic constructor
function getMagicConstructor(imported: any): any {
  // Log what we received for debugging
  console.log('Import type:', typeof imported)
  console.log('Import keys:', Object.keys(imported))
  
  // Case 1: Direct export (Magic is the default export)
  if (typeof imported === 'function') {
    return imported
  }
  
  // Case 2: Magic is a property of the imported module
  if (imported.Magic && typeof imported.Magic === 'function') {
    return imported.Magic
  }
  
  // Case 3: Default export that contains Magic
  if (imported.default) {
    if (typeof imported.default === 'function') {
      return imported.default
    }
    if (imported.default.Magic && typeof imported.default.Magic === 'function') {
      return imported.default.Magic
    }
  }
  
  // Case 4: Some builds export Magic as a property of the module
  if (imported.Magic) {
    return imported.Magic
  }
  
  // If we can't find the constructor, throw
  throw new Error('Could not find Magic constructor in imported module')
}

export default defineEventHandler(async (event) => {
  try {
    // Read request body
    const body = await readBody(event)
    const { didToken } = body

    if (!didToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'DID token is required'
      })
    }

    const secretKey = process.env.MAGIC_SECRET_KEY || config.MAGIC_SECRET_KEY
    if (!secretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Magic SDK not configured - missing secret key'
      })
    }

    // FIXED: Handle Magic import properly
    let Magic: any
    try {
      // First try ESM import (works in some environments)
      try {
        const esmImport = await import('@magic-sdk/admin')
        Magic = getMagicConstructor(esmImport)
        console.log('Magic SDK loaded via ESM import')
      } catch (esmError) {
        console.log('ESM import failed, trying require...', esmError)
        
        // Fallback to require
        const cjsImport = require('@magic-sdk/admin')
        Magic = getMagicConstructor(cjsImport)
        console.log('Magic SDK loaded via require')
      }

      // Verify we got a constructor
      if (typeof Magic !== 'function') {
        throw new Error(`Magic is not a constructor: ${typeof Magic}`)
      }

      // Test that we can instantiate it
      const test = new Magic(secretKey)
      if (!test || typeof test.token?.validate !== 'function') {
        throw new Error('Magic instance missing expected methods')
      }

    } catch (importError) {
      console.error('Failed to load Magic SDK:', importError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Authentication service unavailable - SDK load failed'
      })
    }

    // Initialize Magic with the properly extracted constructor
    const magic = new Magic(secretKey)
    
    // Validate the DID token with Magic
    let magicUserMetadata
    try {
      magic.token.validate(didToken)
      magicUserMetadata = await magic.users.getMetadataByToken(didToken)
    } catch (magicError: any) {
      console.error('Magic token validation error:', magicError)
      
      if (magicError.message?.includes('expired')) {
        throw createError({ statusCode: 401, statusMessage: 'Token has expired' })
      }
      
      if (magicError.message?.includes('invalid')) {
        throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
      }
      
      throw createError({ statusCode: 401, statusMessage: 'Authentication failed' })
    }

    const { email, issuer } = magicUserMetadata

    if (!email) {
      throw createError({ statusCode: 400, statusMessage: 'Email not found in token' })
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
      user = await User.create({
        email,
        role: 'student',
        magicIssuer: issuer
      })
    } else if (!user.magicIssuer && issuer) {
      user.magicIssuer = issuer
      await user.save()
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || config.JWT_SECRET
    if (!jwtSecret) {
      throw createError({ statusCode: 500, statusMessage: 'JWT secret not configured' })
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

    if (error.name === 'ValidationError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid user data',
        data: error.errors
      })
    }

    if (error.code === 11000) {
      throw createError({ statusCode: 409, statusMessage: 'User already exists' })
    }

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})