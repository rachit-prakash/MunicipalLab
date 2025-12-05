import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// This middleware handles:
// 1. Authentication protection for all app routes
// 2. Setting x-request-id header for debugging

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Define public routes that don't require authentication
  const publicRoutes = [
    '/',                    // Landing page
    '/auth/signin',         // Sign in page
    '/api/auth',            // NextAuth API routes
    '/api/demo',            // Demo mode API routes
  ];
  
  // Check if the current path is public
  const isPublicRoute = publicRoutes.some(route => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  });
  
  // Check authentication for protected routes
  if (!isPublicRoute) {
    // Check for demo mode cookie
    const demoMode = request.cookies.get('demo')?.value === '1';
    
    // Check for valid session
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    // If neither demo mode nor valid session, redirect to sign-in
    if (!demoMode && !token) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }
  
  // Set x-request-id header for debugging
  const existingRequestId = request.headers.get('x-request-id');
  const requestId = existingRequestId || crypto.randomUUID();
  
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  response.headers.set('x-request-id', requestId);
  
  return response;
}

export const config = {
  // Match all routes except static files and images
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};

