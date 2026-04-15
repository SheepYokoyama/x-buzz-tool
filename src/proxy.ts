import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 認証チェック proxy。
 * Supabase の auth Cookie の存在だけで判定する（API 通信なし・ハングなし）。
 * セッションの有効性検証は各 API ルートの getAuthUser() で行う。
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 認証不要パスはスキップ
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth')
  ) {
    return NextResponse.next();
  }

  // app-auth Cookie が存在するかチェック（ネットワーク通信なし）
  const hasAuthCookie = request.cookies.has('app-auth');

  if (!hasAuthCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
