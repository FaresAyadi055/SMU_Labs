import { H3Event, createError } from 'h3'

export type UserRole = 'superadmin' | 'admin' | 'instructor' | 'student'

// Check if user has required role
export function requireRole(event: H3Event, allowedRoles: UserRole[]) {
  const user = event.context.user
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - No user context'
    })
  }

  if (!allowedRoles.includes(user.role as UserRole)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - Insufficient permissions'
    })
  }

  return user
}

// Check if user is admin or superadmin (common check)
export function isAdmin(event: H3Event) {
  return requireRole(event, ['admin', 'superadmin'])
}

// Check if user is instructor or above
export function isInstructor(event: H3Event) {
  return requireRole(event, ['instructor', 'admin', 'superadmin'])
}

// Get current user (with fallback for public endpoints)
export function getCurrentUser(event: H3Event) {
  return event.context.user || null
}