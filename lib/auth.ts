import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SESSION_SECRET_ENCODED } from './secrets';

export async function getAuthId(req?: NextRequest) {
  let accessToken: string | undefined;
  
  if (req) {
    accessToken = req.cookies.get('access_token')?.value;
  } else {
    const cookieStore = await cookies();
    accessToken = cookieStore.get('access_token')?.value;
  }

  if (!accessToken) return null;

  try {
    const { payload } = await jwtVerify(
      accessToken,
      SESSION_SECRET_ENCODED
    );
    return payload.id as string;
  } catch (err) {
    return null;
  }
}
