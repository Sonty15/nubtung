import { NextResponse } from 'next/server';
import { getSessionUser, ensureDefaultAdmin } from '@/lib/auth/session';

export async function GET() {
  await ensureDefaultAdmin();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  return NextResponse.json({ authenticated: true, user });
}
