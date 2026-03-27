import { defineEventHandler, createError } from 'h3'
import User from '~/server/models/Users'
import Request from '~/server/models/Requests'
import connectDB from '~/server/utils/db'
import { getCurrentUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()

    const authUser = getCurrentUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const currentUser = await User.findById(authUser.userId || authUser._id)
    if (!currentUser) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    if (!['instructor', 'admin', 'superadmin'].includes(currentUser.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const { email: encodedEmail } = event.context.params || {}
    if (!encodedEmail) {
      throw createError({ statusCode: 400, statusMessage: 'Email required' })
    }

    // Decode the URL‑encoded email (e.g., user%40example.com → user@example.com)
    const email = decodeURIComponent(encodedEmail)

    // Find user by email (case‑insensitive)
    const student = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } }).lean()
    
    if (!student) {
      return { success: true, data: [] }
    }

    // Build filter: requests by this user, filtered by instructor's classes
    const filter: any = { user_id: student._id }
    if (currentUser.role === 'instructor') {
      filter.class = { $in: currentUser.assignedClasses || [] }
    }

    const requests = await Request.find(filter)
      .populate('component_id')
      .sort({ createdAt: -1 })
      .lean()


    // Log sample classes if any
    if (requests.length > 0) {
      const sampleClasses = requests.slice(0, 3).map(r => r.class)
    } else {
      // Debug: show all classes for this student
      const allStudentRequests = await Request.find({ user_id: student._id })
        .lean()
        .limit(5)
      const allClasses = [...new Set(allStudentRequests.map(r => r.class))]
    }

    const formatted = requests.map(req => ({
      id: String(req._id),
      model: (req.component_id as any)?.model || 'Unknown',
      description: (req.component_id as any)?.description,
      link: (req.component_id as any)?.link,
      requested_quantity: req.quantity_requested,
      current_quantity: (req.component_id as any)?.quantity || 0,
      class: req.class,
      status: req.status,
      timestamp: req.createdAt,
    }))

    return { success: true, data: formatted }
  } catch (error: any) {
    console.error('Error fetching student requests:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch requests',
    })
  }
})