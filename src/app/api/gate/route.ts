import { NextResponse } from 'next/server';

/**
 * 共通パスワードゲート。
 * 事前共有の合言葉（APP_GATE_PASSWORD）と一致した場合のみ
 * `gate-ok` Cookie を発行する。Google ログインの手前のゲートとして機能する。
 * パスワード文字列はサーバー側 env のみに存在し、クライアントには露出しない。
 */
export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: '' }));
  const expected = process.env.APP_GATE_PASSWORD ?? '';

  if (!expected || password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('gate-ok', '1', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30日間
  });
  return res;
}
