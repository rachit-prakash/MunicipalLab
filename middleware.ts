import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

// this middleware is used to set the x-request-id header on the request and response. mostly for debugging purposes.

export function middleware(request: NextRequest) {
  // check if x-request-id already exists
  const existingRequestId = request.headers.get('x-request-id');
  
  // generate a new UUID v4 if not present
  const requestId = existingRequestId || randomUUID();
  
  // clone the request headers and set the x-request-id
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  
  // create the response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // set x-request-id on the response for client visibility
  response.headers.set('x-request-id', requestId);
  
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};

