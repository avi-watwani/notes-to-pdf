import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';

// firebase-admin requires Node; default Edge middleware cannot load it.
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const auth = getAdminAuth();
    await auth.verifySessionCookie(sessionCookie, true);
    return NextResponse.next();
  } catch (error) {
    console.error('Session verification failed:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Only these routes run through this file. /login, /signup, /api/*, etc. are not matched.
export const config = {
  matcher: ['/', '/settings', '/calendar'],
};
