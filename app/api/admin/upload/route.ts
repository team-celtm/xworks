import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET!
);

async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    if ((payload as any).role !== 'admin') return null;
    return payload as any;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Cloudinary configuration is missing' }, { status: 500 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Build signature parameters
    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const folder = 'xworks_courses';
    
    // Sort parameters alphabetically
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const stringToSign = `${paramsToSign}${apiSecret}`;
    
    // Calculate SHA-1 hex signature
    const signature = crypto
      .createHash('sha1')
      .update(stringToSign)
      .digest('hex');

    // Create a new FormData to send to Cloudinary
    const cloudinaryFormData = new FormData();
    const blob = new Blob([buffer], { type: file.type });
    cloudinaryFormData.append('file', blob, file.name);
    cloudinaryFormData.append('api_key', apiKey);
    cloudinaryFormData.append('timestamp', timestamp);
    cloudinaryFormData.append('folder', folder);
    cloudinaryFormData.append('signature', signature);

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: cloudinaryFormData
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      console.error('Cloudinary upload failure details:', uploadData);
      return NextResponse.json({ error: uploadData.error?.message || 'Upload to Cloudinary failed' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      url: uploadData.secure_url 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Upload route error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
