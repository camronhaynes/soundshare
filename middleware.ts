import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

// Routes that require authentication (upload routes handle auth internally)
const protectedRoutes = ['/api/tracks'];
const authRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  const token = request.cookies.get('auth-token')?.value;

  // Verify token for protected routes
  if (isProtectedRoute) {
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
  }

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      // @ts-ignore
      return NextResponse.redirect(new URL(`/${payload.username}`, request.url));
    } catch {
      // Invalid token, let them proceed to auth route
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protected API routes
    '/api/tracks/:path*',
    // Auth pages
    '/login',
    '/signup',
    // Skip static files, images, and upload endpoints (they handle auth internally)
    '/((?!_next/static|_next/image|favicon.ico|api/upload|api/stems/upload).*)',
  ],
};