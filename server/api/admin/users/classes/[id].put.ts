import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import mongoose from 'mongoose'
import User from '~/server/models/Users'
import Log from '~/server/models/Logs'
import connectDB from '~/server/utils/db'
import { isSuperAdmin } from '~/server/utils/auth'

const CLASS_PREFIXES = [
  'Freshman', 'Sophomore RE', 'Sophomore CSE',
  'Junior RE', 'Junior CSE',
  'Senior RE', 'Senior CSE',
  'Final Year RE', 'Final Year CSE',
  'Licence','HEC'
]

const CLASS_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function isValidClass(value: string): boolean {
  for (const prefix of CLASS_PREFIXES) {
    for (const num of CLASS_NUMBERS) {
      if (value === `${prefix} G${num}`) return true
    }
  }
  return false
}

export default defineEventHandler(async (event) => {
  try {
    await connectDB()
    const currentUser = isSuperAdmin(event)

    const id = getRouterParam(event, 'id')
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })
    }

    let body: { assignedClasses?: string[] }
    try {
      body = await readBody(event)
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Invalid JSON body' })
    }

    if (!Array.isArray(body.assignedClasses)) {
      throw createError({ statusCode: 400, statusMessage: 'assignedClasses must be an array' })
    }

    // Deduplicate
    const classes = [...new Set(body.assignedClasses)]

    // Validate each class string
    const invalid = classes.filter((c) => !isValidClass(c))
    if (invalid.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid class values: ${invalid.join(', ')}`,
      })
    }

    const userBefore = await User.findById(id)
    if (!userBefore) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    if (userBefore.role !== 'instructor') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Classes can only be assigned to users with the instructor role',
      })
    }

    const previousClasses = userBefore.assignedClasses ?? []

    // runValidators omitted: schema validator uses `this.role` which resolves to the
    // query context (not the document) in findByIdAndUpdate, so the role check always
    // fails. Class strings and instructor role are already validated manually above.
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { assignedClasses: classes } },
      { returnDocument: 'after' }
    )

    if (!updatedUser) {
      throw createError({ statusCode: 404, statusMessage: 'User not found after update' })
    }

    // Log the change
    const log = new Log({
      action: 'USER_CLASSES_UPDATE',
      userId: new mongoose.Types.ObjectId(currentUser.userId),
      userEmail: currentUser.email,
      userRole: currentUser.role,
      metadata: {
        entityId: updatedUser._id,
        entityType: 'user',
        before: {
          email: userBefore.email,
          role: userBefore.role,
          assignedClasses: previousClasses,
        },
        after: {
          email: updatedUser.email,
          role: updatedUser.role,
          assignedClasses: updatedUser.assignedClasses,
        },
        description: `Instructor assigned classes updated (${previousClasses.length} → ${classes.length} classes)`,
      },
    })
    await log.save()

    return {
      success: true,
      message: 'Classes updated',
      data: {
        id: String(updatedUser._id),
        email: updatedUser.email,
        role: updatedUser.role,
        assignedClasses: updatedUser.assignedClasses,
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update assigned classes',
    })
  }
})