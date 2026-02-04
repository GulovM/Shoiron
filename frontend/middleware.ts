import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const hasCookie = request.cookies.get('shoieron_uid');
  if (!hasCookie) {
    response.cookies.set('shoieron_uid', crypto.randomUUID(), {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 * 5,
    });
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)'],
};
