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

  // 合言葉ゲート（gate-ok）と認証（app-auth）の両方の Cookie をチェック
  // （ネットワーク通信なし）。どちらか欠けていれば /login へ。
  const hasGate = request.cookies.has('gate-ok');
  const hasAuthCookie = request.cookies.has('app-auth');

  if (!hasGate || !hasAuthCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
