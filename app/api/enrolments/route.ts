import { NextRequest, NextResponse } from 'next/server';
import { POST as learnerPost } from '../learner/enrolments/route';

export async function POST(req: NextRequest) {
  return learnerPost(req);
}
