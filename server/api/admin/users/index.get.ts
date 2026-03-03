import { defineEventHandler, getQuery, createError } from 'h3'
import User from '~/server/models/Users'
import connectDB from '~/server/utils/db'
import { isAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()
    isAdmin(event)

    const query = getQuery(event)
    const { role } = query

    const filter: any = {}
    if (role && typeof role === 'string') {
      filter.role = role
    }

    const users = await User.find(filter).sort({ createdAt: -1 }).lean()

    const data = users.map((u: any) => ({
      id: String(u._id),
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }))

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch users',
    })
  }
})

