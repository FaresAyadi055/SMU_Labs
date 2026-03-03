import { defineEventHandler, getRequestHeader, createError } from 'h3'
import jwt from 'jsonwebtoken'

declare module 'h3' {
  interface H3EventContext {
    user?: {
      userId: string;
      email: string;
      role: string;
    };
  }
}


export default defineEventHandler(async (event) => {
  const path = event.path
  
  // Define public API routes that don't need authentication
  const publicApiPaths = [
    '/api/auth/login',
    '/api/auth/magic/verify',
    '/api/health',
  ]

  // Check if this is an API route
  const isApiRoute = path.startsWith('/api/')
  
  if (isApiRoute) {
    // For API routes, check if they're public
    const isPublicApi = publicApiPaths.some(publicPath => 
      path === publicPath || path.startsWith(publicPath + '/')
    )
    
    if (isPublicApi) {

      return
    }
    
    // For protected API routes, require authentication

    return await authenticateRequest(event)
  } else {
    // For frontend routes, we don't need to authenticate in server middleware
    // The frontend will handle authentication via navigation guards

    return
  }
})

async function authenticateRequest(event: any) {
  const authHeader = getRequestHeader(event, 'authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {

    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - No token provided'
    })
  }

  const token = authHeader.substring(7)

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    
    event.context.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    }
    


  } catch (jwtError) {

    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Invalid token'
    })
  }
}