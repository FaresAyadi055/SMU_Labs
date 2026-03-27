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

    // Get the user before update for logging purposes
    const userBefore = await User.findById(id)
    if (!userBefore) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    const previousRole = userBefore.role
    const newRole = body.role

    // Prepare update data
    let updateData: any = { role: newRole }
    
    if (newRole === 'instructor') {
      // When changing to instructor, set assignedClasses to empty array
      updateData.$set = { assignedClasses: [] }
    } else if (previousRole === 'instructor' && newRole !== 'instructor') {
      // When changing from instructor to another role, remove assignedClasses field
      updateData.$unset = { assignedClasses: "" }
    }

    // Execute the update
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )

    if (!updatedUser) {
      throw createError({ statusCode: 404, statusMessage: 'User not found after update' })
    }

    // Create log entry
    const log = new Log({
      action: 'USER_UPDATE',
      userId: new mongoose.Types.ObjectId(currentUser.userId),
      userEmail: currentUser.email,
      userRole: currentUser.role,
      metadata: {
        entityId: updatedUser._id,
        entityType: 'user',
        before: { 
          email: userBefore.email, 
          role: previousRole,
          ...(previousRole === 'instructor' && { assignedClasses: userBefore.assignedClasses })
        },
        after: { 
          email: updatedUser.email, 
          role: updatedUser.role,
          ...(newRole === 'instructor' && { assignedClasses: updatedUser.assignedClasses })
        },
        description: `User role changed from ${previousRole} to ${updatedUser.role}`,
      },
    })
    await log.save()

    return {
      success: true,
      message: 'User updated',
      data: {
        id: String(updatedUser._id),
        email: updatedUser.email,
        role: updatedUser.role,
        ...(updatedUser.role === 'instructor' && { assignedClasses: updatedUser.assignedClasses }),
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