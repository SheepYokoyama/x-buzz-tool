import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 認証不要パスはスキップ
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/callback')
  ) {
    return NextResponse.next();
  }

  // Supabase セッションを Cookie からリフレッシュ
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // リクエスト側にも Cookie を反映（下流の Server Component が読めるように）
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // レスポンスを再生成して Cookie を設定
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未認証 → ログインページへリダイレクト
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // 静的ファイル・画像最適化・メタデータファイル・API は除外
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
