import { defineEventHandler, getRequestHeader, createError } from 'h3'
import jwt from 'jsonwebtoken'

const config = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getRequestHeader(event, 'authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    
    
    return {
      success: true,
      message: 'Logged out successfully'
    }
    
  } catch (error) {
    console.error('Logout error:', error)
    return {
      success: true,
      message: 'Logged out successfully'
    }
  }
})