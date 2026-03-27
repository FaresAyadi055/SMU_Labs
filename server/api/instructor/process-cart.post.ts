// api/instructor/process-cart.post.ts
import { defineEventHandler, createError } from 'h3'
import mongoose from 'mongoose'
import Request from '~/server/models/Requests'
import Component from '~/server/models/Components'
import User from '~/server/models/Users'
import Log from '~/server/models/Logs'
import connectDB from '~/server/utils/db'
import { getCurrentUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()
    
    // Get authenticated user
    const authUser = getCurrentUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      })
    }

    // Verify role
    if (!['instructor', 'admin', 'superadmin'].includes(authUser.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Insufficient permissions',
      })
    }

    // Fetch full user from database
    const currentUser = await User.findById(authUser.userId || authUser._id)
    if (!currentUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found',
      })
    }
    
    const { items } = await readBody(event)
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request: items array required',
      })
    }
    
    const results = []
    const logs = []
    
    for (const item of items) {
      const { requestId, verifiedQuantity, decision } = item
      
      // Find the request
      const request = await Request.findById(requestId)
        .populate('user_id')
        .populate('component_id')
      
      if (!request) {
        results.push({ requestId, success: false, error: 'Request not found' })
        continue
      }
      
      // For instructors, verify that the request belongs to their class
      if (currentUser.role === 'instructor') {
        const assignedClasses = currentUser.assignedClasses || []
        if (!assignedClasses.includes(request.class)) {
          results.push({ requestId, success: false, error: 'Not authorized to process this request' })
          continue
        }
      }
      
      if (decision === 'verify') {
        // Verify the request (changes status to 'verified')
        const oldStatus = request.status
        
        request.status = 'verified'
        
        // Optionally update the quantity requested to the verified quantity
        // if the instructor reduced it
        if (verifiedQuantity && verifiedQuantity < request.quantity_requested) {
          const oldQuantity = request.quantity_requested
          request.quantity_requested = verifiedQuantity
          
          // Log the verification with quantity change
          logs.push({
            action: 'REQUEST_APPROVE',
            userId: currentUser._id,
            userEmail: currentUser.email,
            userRole: currentUser.role,
            metadata: {
              entityId: request._id,
              entityType: 'Request',
              changes: [
                {
                  field: 'status',
                  oldValue: oldStatus,
                  newValue: 'verified',
                },
                {
                  field: 'quantity_requested',
                  oldValue: oldQuantity,
                  newValue: verifiedQuantity,
                },
              ],
              reason: `Request verified by ${currentUser.role}`,
            },
            sessionId: event.context.sessionId,
            ip: event.context.ip,
            userAgent: event.headers['user-agent'],
          })
        } else {
          // Log just the verification
          logs.push({
            action: 'REQUEST_VERIFY',
            userId: currentUser._id,
            userEmail: currentUser.email,
            userRole: currentUser.role,
            metadata: {
              entityId: request._id,
              entityType: 'Request',
              changes: [
                {
                  field: 'status',
                  oldValue: oldStatus,
                  newValue: 'verified',
                },
              ],
              reason: `Request verified by ${currentUser.role}`,
            },
            sessionId: event.context.sessionId,
            ip: event.context.ip,
            userAgent: event.headers['user-agent'],
          })
        }
        
        await request.save()
        results.push({ requestId, success: true, action: 'verified', quantity: verifiedQuantity })
        
      } else if (decision === 'decline') {
        // Decline the request
        const oldStatus = request.status
        request.status = 'declined'
        
        await request.save()
        
        // Log the decline
        logs.push({
          action: 'REQUEST_DECLINE',
          userId: currentUser._id,
          userEmail: currentUser.email,
          userRole: currentUser.role,
          metadata: {
            entityId: request._id,
            entityType: 'Request',
            changes: [
              {
                field: 'status',
                oldValue: oldStatus,
                newValue: 'declined',
              },
            ],
            reason: `Request declined by ${currentUser.role}`,
          },
          sessionId: event.context.sessionId,
          ip: event.context.ip,
          userAgent: event.headers['user-agent'],
        })
        
        results.push({ requestId, success: true, action: 'declined' })
      } else {
        results.push({ requestId, success: false, error: `Invalid decision: ${decision}` })
      }
    }
    
    // Save all logs
    if (logs.length > 0) {
      await Log.insertMany(logs)
    }
    
    return {
      success: true,
      results,
      logsCreated: logs.length,
    }
    
  } catch (error: any) {
    console.error('Error processing instructor cart:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to process cart',
    })
  }
})