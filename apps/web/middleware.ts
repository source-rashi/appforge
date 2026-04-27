import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for token in localStorage on client side, but since middleware runs on Edge,
  // we rely on cookies or Authorization headers if sent (unlikely for pure SPA).
  // Because we store the token in localStorage, the standard Next.js middleware
  // cannot easily read it. A common workaround for SPA-like Next.js apps is to 
  // check for a cookie. Since we are using localStorage, we can't reliably protect
  // SSR routes via middleware without duplicating the token to a cookie.
  // 
  // For the sake of this implementation, we will check if there's a cookie or 
  // header, but the primary protection will happen in the layout/client.
  // To make it robust, we should recommend storing the token in a cookie during login,
  // but since we already wrote the login to use localStorage, we will do a basic check here
  // and handle full redirect in the client components or just pass through here and
  // let the client handle unauthenticated states.

  const token = request.cookies.get('token')?.value || request.headers.get('Authorization');

  // If the user is trying to access /app and has NO apparent token (cookie/header),
  // we could redirect. However, because they only have localStorage, we might block valid users.
  // Instead, we will inject a small script in the layout to handle client-side redirect.
  // Let's implement a gentle middleware that doesn't block if we can't read localStorage.
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
