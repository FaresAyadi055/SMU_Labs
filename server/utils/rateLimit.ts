import { H3Event, createError, getRequestHeader } from 'h3';
import RateLimit from '~/server/models/RateLimit';
import connectDB from './db';

interface RateLimitOptions {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
  keyPrefix?: string;  // Prefix for the rate limit key
}

/**
 * Basic rate limiter using MongoDB to store hits.
 * Works across serverless function invocations.
 */
export async function rateLimit(event: H3Event, options: RateLimitOptions) {
  await connectDB();

  // Identify the requester (prefer X-Forwarded-For in Vercel)
  const ip = getRequestHeader(event, 'x-forwarded-for') || 
             getRequestHeader(event, 'x-real-ip') || 
             'unknown-ip';
  
  const key = `${options.keyPrefix || 'rl'}:${ip}`;
  const now = new Date();

  try {
    // Find existing rate limit record
    let record = await RateLimit.findOne({ key });

    if (!record) {
      // Create new record if it doesn't exist
      const expireAt = new Date(now.getTime() + options.windowMs);
      record = await RateLimit.create({
        key,
        points: 1,
        expireAt
      });
      return true;
    }

    // Check if limit exceeded
    if (record.points >= options.maxRequests) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests, please try again later.'
      });
    }

    // Increment points
    record.points += 1;
    await record.save();

    return true;
  } catch (error: any) {
    if (error.statusCode === 429) throw error;
    
    // Log error but don't block requests if database fails (fail-open)
    console.error('Rate limit error:', error);
    return true;
  }
}