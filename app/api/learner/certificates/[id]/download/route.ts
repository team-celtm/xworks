import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';
import { PDFDocument, rgb } from 'pdf-lib';

// Certificate Download Route - Dynamically generated
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const { id: credentialId } = await params;

    const sql = `
      SELECT 
        c.credential_id, 
        c.issued_at,
        u.first_name, 
        u.last_name,
        co.name as course_name
      FROM certificates c
      JOIN users u ON c.user_id = u.id
      JOIN courses co ON c.course_id = co.id
      WHERE c.credential_id = $1 AND c.user_id = $2 AND c.status = 'issued'
    `;
    const { rows } = await pool.query(sql, [credentialId, userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Certificate not found or not issued' }, { status: 404 });
    }

    const certData = rows[0];
    
    // Generate PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const { width, height } = page.getSize();
    
    page.drawText('Certificate of Completion', {
      x: 160,
      y: height - 100,
      size: 24,
      color: rgb(0.2, 0.2, 0.6),
    });
    
    page.drawText('This certifies that', {
      x: 235,
      y: height - 150,
      size: 14,
    });
    
    page.drawText(`${certData.first_name} ${certData.last_name}`, {
      x: 230,
      y: height - 190,
      size: 20,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('has successfully completed the course', {
      x: 185,
      y: height - 230,
      size: 14,
    });
    
    page.drawText(certData.course_name, {
      x: 160,
      y: height - 270,
      size: 18,
      color: rgb(0.2, 0.4, 0.6),
    });
    
    page.drawText(`Credential ID: ${certData.credential_id}`, {
      x: 50,
      y: 50,
      size: 10,
    });
    
    page.drawText(`Issued: ${new Date(certData.issued_at).toLocaleDateString()}`, {
      x: 450,
      y: 50,
      size: 10,
    });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${credentialId}.pdf"`
      }
    });

  } catch (error) {
    console.error('Download Certificate API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
