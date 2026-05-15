import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'your-default-secret-change-me'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;

  // Define route groups
  const isAdminPath = pathname.startsWith('/admin');
  const isInstructorPath = pathname.startsWith('/instructor');
  const isLearnerPath = pathname.startsWith('/dashboard') || pathname.startsWith('/player') || pathname.startsWith('/teach');
  
  const isAuthRequired = isAdminPath || isInstructorPath || isLearnerPath;

  if (isAuthRequired) {
    // 1. Not logged in -> Redirect to Login
    if (!accessToken) {
      const url = new URL('/Login', request.url);
      // Optional: Add redirect callback
      // url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    try {
      // 2. Logged in -> Verify Token and Check Role
      const { payload } = await jwtVerify(accessToken, SESSION_SECRET);
      const role = (payload as any).role;
      const status = (payload as any).status;

      // Check for suspended status
      if (status === 'suspended') {
        const response = NextResponse.redirect(new URL('/Login?error=suspended', request.url));
        response.cookies.delete('access_token');
        response.cookies.delete('refresh_token');
        return response;
      }

      // Admin paths: only for admins
      if (isAdminPath && role !== 'admin') {
        const target = role === 'instructor' ? '/instructor' : '/dashboard';
        return NextResponse.redirect(new URL(target, request.url));
      }

      // Instructor paths: only for instructors
      if (isInstructorPath && role !== 'instructor') {
        const target = role === 'admin' ? '/admin' : '/dashboard';
        return NextResponse.redirect(new URL(target, request.url));
      }

      // Learner paths: Redirect admins/instructors to their specific dashboards
      // (This matches existing client-side logic in the app)
      if (isLearnerPath) {
        if (role === 'admin') {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
        if (role === 'instructor') {
          return NextResponse.redirect(new URL('/instructor', request.url));
        }
      }

    } catch (error) {
      // 3. Invalid/Expired Token -> Clear and Redirect
      const response = NextResponse.redirect(new URL('/Login', request.url));
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      return response;
    }
  }

  // 4. Auth Pages (Login/Registration)
  // If already logged in, redirect away from these pages to the appropriate dashboard
  if (pathname === '/Login' || pathname === '/Registration') {
    if (accessToken) {
      try {
        const { payload } = await jwtVerify(accessToken, SESSION_SECRET);
        const role = (payload as any).role;
        const target = role === 'admin' ? '/admin' : (role === 'instructor' ? '/instructor' : '/dashboard');
        return NextResponse.redirect(new URL(target, request.url));
      } catch (e) {
        // Token invalid, clear it and let them see the login page
        const response = NextResponse.next();
        response.cookies.delete('access_token');
        response.cookies.delete('refresh_token');
        return response;
      }
    }
  }

  return NextResponse.next();
}

// Optimized matcher for performance
export const config = {
  matcher: [
    '/admin/:path*',
    '/instructor/:path*',
    '/dashboard/:path*',
    '/player/:path*',
    '/teach/:path*',
    '/Login',
    '/Registration',
  ],
};
