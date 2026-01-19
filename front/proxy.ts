import { NextRequest, NextResponse } from 'next/server';

// Next.js 15: middleware for route protection
// Runtime is edge by default

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/register', '/'];

  // Check if it's a public path
  const isPublicPath = publicPaths.some(path =>
    pathname === path || pathname.startsWith('/api/')
  );

  // Get token from cookies (if using cookies) or skip for now
  // since we're using localStorage for JWT tokens
  // The actual auth check happens client-side via AuthContext

  // For now, just pass through all requests
  // Auth protection is handled by the AuthContext in client components
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
