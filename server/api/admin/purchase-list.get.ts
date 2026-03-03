import { defineEventHandler, createError } from 'h3'
import mongoose from 'mongoose'
import Request from '~/server/models/Requests'
import connectDB from '~/server/utils/db'
import { requireRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()

    // Only admins/technicians see purchase recommendations
    requireRole(event, ['instructor', 'admin', 'superadmin'])

const pipeline: mongoose.PipelineStage[] = [
  {
    $match: {
      status: 'pending',
    },
  },
  {
    $group: {
      _id: '$component_id',
      totalPending: { $sum: '$quantity_requested' },
      // Keep track of user/class info if needed
      requests: { 
        $push: {
          requestId: '$_id',
          quantity: '$quantity_requested',
          class: '$class',
          userId: '$user_id',
          createdAt: '$createdAt'
        }
      }
    },
  },
  {
    $lookup: {
      from: 'inventory',
      localField: '_id',
      foreignField: '_id',
      as: 'component',
    },
  },
  {
    $unwind: {
      path: '$component',
      preserveNullAndEmptyArrays: false, // Only include components that exist in inventory
    },
  },
  {
    $addFields: {
      // Calculate missing quantity (0 if stock is sufficient)
      missing: {
        $max: [
          { $subtract: ['$totalPending', '$component.quantity'] },
          0
        ]
      },
      // Add component details at the top level for easier access
      componentId: '$_id',
      model: '$component.model',
      description: '$component.description',
      location: '$component.location',
      link: '$component.link',
      inStock: '$component.quantity',
    },
  },
  {
    $project: {
      _id: 0,
      componentId: 1,
      model: 1,
      description: 1,
      location: 1,
      link: 1,
      inStock: 1,
      totalPending: 1,
      missing: 1,
      // Include requests details if needed
      requests: 1,
    },
  },
  {
    $sort: {
      missing: -1, // Sort by most needed first
      totalPending: -1,
    },
  },
]

const results = await Request.aggregate(pipeline)

const data = results.map((item: any) => ({
  componentId: String(item.componentId),
  model: item.model,
  description: item.description,
  location: item.location,
  link: item.link,
  inStock: item.inStock,
  totalRequested: item.totalPending,
  suggestedPurchaseQuantity: item.missing, // This will be 0 if stock is sufficient
  // Include request details if needed
  pendingRequests: item.requests.map((req: any) => ({
    requestId: String(req.requestId),
    quantity: req.quantity,
    class: req.class,
    userId: String(req.userId),
    requestedAt: req.createdAt
  }))
}))

    return {
      success: true,
      data,
      meta: {
        total: data.length,
      },
    }
  } catch (error: any) {
    console.error('Error generating purchase list:', error)

    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to generate purchase list',
    })
  }
})

