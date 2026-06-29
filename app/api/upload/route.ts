import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { v2 as cloudinary } from 'cloudinary';
import pool from '@/lib/db';

const SESSION_SECRET = process.env.SESSION_SECRET!;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload;
    try {
      const verified = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
      payload = verified.payload;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (payload as any).id;
    const checkUser = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    const userRole = checkUser.rows[0]?.role;
    
    if (userRole !== 'instructor' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only instructors and admins can upload files' }, { status: 403 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: 'Cloudinary credentials are not configured on the server.' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 });
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, WEBP, GIF images and MP4, WEBM, MOV videos are allowed.' }, { status: 400 });
    }

    const isVideo = file.type.startsWith('video/');

    // 50MB max for videos
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'xworks_courses', resource_type: isVideo ? 'video' : 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({ success: true, url: uploadResult.secure_url }, { status: 200 });

  } catch (error) {
    console.error('API Error /upload POST:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
