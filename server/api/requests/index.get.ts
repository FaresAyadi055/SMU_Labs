import { defineEventHandler, getQuery, createError } from 'h3'
import mongoose from 'mongoose'
import Request from '~/server/models/Requests'
import User from '~/server/models/Users'
import Component from '~/server/models/Components'
import connectDB from '~/server/utils/db'
import { getCurrentUser, isAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()
    
    isAdmin(event)

    const query = getQuery(event)
    const {
      status,
      search,
      page = 1,
      limit = 50
    } = query

    const pageNum = Number(page)
    const limitNum = Math.min(Number(limit), 100)
    const skip = (pageNum - 1) * limitNum

    let componentIds: mongoose.Types.ObjectId[] | undefined
    if (search) {
      const components = await Component.find({
        $or: [
          { model: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').limit(1000).lean()
      componentIds = components.map(c => c._id as mongoose.Types.ObjectId)
      
      if (componentIds.length === 0) {
        return {
          success: true,
          data: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 }
        }
      }
    }

    const requestFilter: any = {}
    if (status) requestFilter.status = status
    if (search && componentIds) {
      requestFilter.component_id = { $in: componentIds }
    }

    const userPipeline: any[] = [
      { $match: requestFilter },
      {
        $lookup: {
          from: 'components',
          localField: 'component_id',
          foreignField: '_id',
          as: 'component'
        }
      },
      { $unwind: { path: '$component', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$user_id',
          user: { $first: '$user' },
          requests: { $push: '$$ROOT' },
          stats: {
            $push: '$status'
          },
          mostRecentPending: {
            $max: {
              $cond: [
                { $eq: ['$status', 'pending'] },
                '$createdAt',
                null
              ]
            }
          }
        }
      },
      { $match: { user: { $ne: null } } },
      {
        $project: {
          _id: 0,
          user: {
            id: '$user._id',
            email: '$user.email',
            role: '$user.role'
          },
          stats: {
            total: { $size: '$stats' },
            pending: {
              $size: {
                $filter: {
                  input: '$stats',
                  as: 's',
                  cond: { $eq: ['$$s', 'pending'] }
                }
              }
            },
            approved: {
              $size: {
                $filter: {
                  input: '$stats',
                  as: 's',
                  cond: { $eq: ['$$s', 'approved'] }
                }
              }
            },
            declined: {
              $size: {
                $filter: {
                  input: '$stats',
                  as: 's',
                  cond: { $eq: ['$$s', 'declined'] }
                }
              }
            },
            returned: {
              $size: {
                $filter: {
                  input: '$stats',
                  as: 's',
                  cond: { $eq: ['$$s', 'returned'] }
                }
              }
            }
          },
          mostRecentPending: 1,
          requests: 1
        }
      },
      { $sort: { mostRecentPending: -1 } }
    ]

    const [groupedResults, totalCountResult] = await Promise.all([
      Request.aggregate(userPipeline).skip(skip).limit(limitNum),
      Request.aggregate([
        { $match: requestFilter },
        { $group: { _id: '$user_id' } },
        { $count: 'total' }
      ])
    ])

    const total = totalCountResult[0]?.total || 0

    const data = groupedResults.map(r => ({
      user: {
        id: r.user?._id || r.user?.id,
        email: r.user?.email,
        role: r.user?.role
      },
      stats: r.stats,
      mostRecentPending: r.mostRecentPending,
      requests: r.requests.map((req: any) => ({
        id: req._id,
        component: req.component ? {
          id: req.component._id,
          model: req.component.model,
          description: req.component.description,
          link: req.component.link
        } : null,
        quantity: req.available_quantity || req.quantity_requested,
        class: req.class,
        status: req.status,
        createdAt: req.createdAt
      }))
    }))

    return {
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }

  } catch (error: any) {
    console.error('Error fetching all requests:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch requests'
    })
  }
})