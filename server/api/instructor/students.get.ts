import { defineEventHandler, createError } from 'h3'
import mongoose from 'mongoose'
import User from '~/server/models/Users'
import Request from '~/server/models/Requests'
import connectDB from '~/server/utils/db'
import { getCurrentUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()

    // Authenticate and get full user
    const authUser = getCurrentUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const currentUser = await User.findById(authUser.userId || authUser._id)
    if (!currentUser) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    // Only instructors, admins, superadmins can access
    if (!['instructor', 'admin', 'superadmin'].includes(currentUser.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const assignedClasses = currentUser.assignedClasses || []
    if (currentUser.role === 'instructor' && assignedClasses.length === 0) {
      return { success: true, data: [], classStats: [] }
    }

    // Build filter: ALL requests in assigned classes (no status filter)
    const filter: any = {}
    if (currentUser.role === 'instructor') {
      filter.class = { $in: assignedClasses }
    }

    // Get all requests, sorted newest first
    const allRequests = await Request.find(filter)
      .populate('user_id', 'email role')
      .sort({ createdAt: -1 })
      .lean()

    // Group by user: store only the latest request info
    const userMap = new Map<string, any>()
    // Track per class: student IDs (excluding current user)
    const classStudentsMap = new Map<string, Set<string>>()

    // First pass: gather latest request per user
    for (const req of allRequests as any[]) {
      const user = req.user_id
      if (!user) continue
      const userId = String(user._id)

      if (!userMap.has(userId)) {
        // This is the most recent request for this user (because we sorted by createdAt descending)
        userMap.set(userId, {
          id: userId,
          email: user.email,
          role: user.role,
          class: req.class,
          latestRequestAt: req.createdAt,
          requestCount: 1,   // will increment later if needed, but for now we know it's the latest
          pendingCount: (req.status === 'pending' || req.status === 'verified') ? 1 : 0,
        })
      } else {
        // Later requests (older) – just increment counts
        const student = userMap.get(userId)
        student.requestCount += 1
        if (req.status === 'pending' || req.status === 'verified') {
          student.pendingCount += 1
        }
        // Do not update class/latestRequestAt because we already have the latest
      }
    }

    // Second pass: compute class statistics using only the latest request class of each user
    // (excluding the current user)
    for (const [userId, student] of userMap.entries()) {
      // Skip the current user (instructor) from class counts
      if (userId === String(currentUser._id)) continue

      const latestClass = student.class
      if (!classStudentsMap.has(latestClass)) {
        classStudentsMap.set(latestClass, new Set())
      }
      classStudentsMap.get(latestClass)!.add(userId)
    }

    // Build classStats: include all assigned classes, with count = number of distinct students
    const classStats = assignedClasses.map(className => ({
      className,
      studentCount: classStudentsMap.get(className)?.size ?? 0,
    })).sort((a, b) => a.className.localeCompare(b.className))

    // Prepare the students list (including the instructor)
    const students = Array.from(userMap.values()).sort((a, b) =>
      new Date(b.latestRequestAt).getTime() - new Date(a.latestRequestAt).getTime()
    )

    return {
      success: true,
      data: students,
      classStats,
      instructorInfo: {
        assignedClasses,
        classCount: assignedClasses.length,
      },
    }
  } catch (error: any) {
    console.error('Error fetching students:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch students',
    })
  }
})