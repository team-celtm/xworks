import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthId } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const userId = await getAuthId(req);
    
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    console.log(`[DELETE] Note: ${id} | User: ${userId}`);

    const { rowCount } = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (rowCount === 0) {
      console.warn(`[DELETE] Failed - Note ${id} not found for User ${userId}`);
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
