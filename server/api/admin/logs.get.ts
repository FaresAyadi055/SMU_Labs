import { defineEventHandler, getQuery, createError } from 'h3'
import Log from '~/server/models/Logs'
import connectDB from '~/server/utils/db'
import { requireRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()

    // Only admins and instructors can view system logs
    requireRole(event, ['instructor', 'admin', 'superadmin'])

    const query = getQuery(event)
    const {
      page = '1',
      limit = '50',
      action,
      userEmail,
      sortOrder = 'desc',
    } = query

    const pageNum = Math.max(parseInt(String(page), 10) || 1, 1)
    const limitNum = Math.min(
      Math.max(parseInt(String(limit), 10) || 50, 1),
      200,
    )

    const filter: any = {}

    if (action && typeof action === 'string') {
      filter.action = action
    }

    if (userEmail && typeof userEmail === 'string') {
      filter.userEmail = userEmail.toLowerCase()
    }

    const sort: any = {
      timestamp: sortOrder === 'asc' ? 1 : -1,
    }

    const skip = (pageNum - 1) * limitNum

    const [logs, total] = await Promise.all([
      Log.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Log.countDocuments(filter),
    ])

    const data = logs.map((log: any) => ({
      id: String(log._id),
      action: log.action,
      userEmail: log.userEmail,
      userRole: log.userRole,
      timestamp: log.timestamp,
      metadata: log.metadata || {},
    }))

    return {
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    }
  } catch (error: any) {
    console.error('Error fetching logs:', error)

    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch logs',
    })
  }
})

