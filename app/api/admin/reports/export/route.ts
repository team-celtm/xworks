import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'your-default-secret-change-me'
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

export async function GET(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'revenue';
    const format = searchParams.get('format') || 'csv';
    const fromStr = searchParams.get('from') || '1970-01-01';
    const toStr = searchParams.get('to') || '2099-12-31';

    // Parse dates to validate
    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date parameters' }, { status: 400 });
    }

    // Set timestamps to start and end of day respectively
    const fromVal = fromDate.toISOString().split('T')[0] + ' 00:00:00';
    const toVal = toDate.toISOString().split('T')[0] + ' 23:59:59';

    let data: any[] = [];
    let headers: string[] = [];
    let title = '';

    if (type === 'revenue') {
      title = 'Revenue Transaction Report';
      headers = ['Date', 'ID', 'Learner', 'Course', 'Amount (INR)', 'Net Amount', 'Method', 'Status'];
      
      const sql = `
        SELECT 
          p.created_at::text as date, 
          p.id::text as id, 
          COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as learner, 
          COALESCE(c.name, 'Unknown') as course, 
          p.amount::text as amount, 
          COALESCE(p.net_amount, p.amount)::text as net, 
          COALESCE(p.payment_method, 'Unknown') as method, 
          COALESCE(p.payment_status, p.status) as status
        FROM (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY COALESCE(NULLIF(razorpay_payment_id, ''), id::text) ORDER BY created_at DESC) as rn
          FROM payments
        ) p
        LEFT JOIN enrolments e ON e.id::text = p.enrolment_id
        LEFT JOIN users u ON u.id::text = p.user_id OR e.user_id = u.id
        LEFT JOIN courses c ON e.course_id = c.id
        WHERE p.rn = 1 AND p.created_at >= $1 AND p.created_at <= $2
        ORDER BY p.created_at DESC
      `;
      const res = await pool.query(sql, [fromVal, toVal]);
      data = res.rows;
    } else if (type === 'instructors') {
      title = 'Instructor Performance Report';
      headers = ['Instructor', 'Email', 'Status', 'Courses Taught', 'Total Revenue Generated (INR)'];
      
      const sql = `
        SELECT 
          u.first_name || ' ' || u.last_name as instructor, 
          u.email, 
          u.status,
          COUNT(DISTINCT c.id)::text as courses_count, 
          COALESCE(SUM(p.amount), 0)::text as total_revenue
        FROM instructors i
        JOIN users u ON i.user_id = u.id
        LEFT JOIN courses c ON c.instructor_id = i.id AND c.status != 'deleted'
        LEFT JOIN enrolments e ON e.course_id = c.id
        LEFT JOIN (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY COALESCE(NULLIF(razorpay_payment_id, ''), id::text) ORDER BY created_at DESC) as rn
          FROM payments
        ) p ON e.id::text = p.enrolment_id AND p.rn = 1 AND COALESCE(p.payment_status, p.status) IN ('paid', 'success', 'captured')
        GROUP BY i.id, u.first_name, u.last_name, u.email, u.status
        ORDER BY total_revenue DESC
      `;
      const res = await pool.query(sql);
      data = res.rows;
    } else if (type === 'enrollments') {
      title = 'Student Enrollment Report';
      headers = ['Date', 'Student Name', 'Course Name', 'Status', 'Progress %', 'Price Paid'];
      
      const sql = `
        SELECT 
          e.enrolled_at::text as date, 
          u.first_name || ' ' || u.last_name as student, 
          c.name as course, 
          e.status, 
          e.progress_pct::text as progress, 
          (e.price_paid_paise / 100.0)::text as price
        FROM enrolments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        WHERE e.enrolled_at >= $1 AND e.enrolled_at <= $2
        ORDER BY e.enrolled_at DESC
      `;
      const res = await pool.query(sql, [fromVal, toVal]);
      data = res.rows;
    } else if (type === 'attendance') {
      title = 'Live Session Attendance Report';
      headers = ['Session Name', 'Course Name', 'Student Name', 'Join Time', 'Leave Time', 'Duration (secs)', 'Status'];
      
      const sql = `
        SELECT 
          ls.title as session_name, 
          c.name as course, 
          u.first_name || ' ' || u.last_name as student,
          sa.join_time::text, 
          sa.leave_time::text, 
          sa.duration_seconds::text, 
          sa.status
        FROM session_attendance sa
        JOIN users u ON sa.user_id = u.id
        JOIN live_sessions ls ON sa.session_id = ls.id
        JOIN courses c ON ls.course_id = c.id
        WHERE sa.join_time >= $1 AND sa.join_time <= $2
        ORDER BY sa.join_time DESC
      `;
      const res = await pool.query(sql, [fromVal, toVal]);
      data = res.rows;
    } else if (type === 'completions') {
      title = 'Course Completion Report';
      headers = ['Completion Date', 'Student Name', 'Course Name', 'Certificate ID'];
      
      const sql = `
        SELECT 
          e.completed_at::text as date, 
          u.first_name || ' ' || u.last_name as student,
          c.name as course, 
          COALESCE(cert.credential_id, 'Not Issued') as credential_id
        FROM enrolments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN certificates cert ON e.id = cert.enrolment_id
        WHERE e.status = 'completed' AND e.completed_at >= $1 AND e.completed_at <= $2
        ORDER BY e.completed_at DESC
      `;
      const res = await pool.query(sql, [fromVal, toVal]);
      data = res.rows;
    } else {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Export Format handling
    if (format === 'csv') {
      // Generate CSV
      let csvContent = headers.join(',') + '\n';
      data.forEach(row => {
        const values = Object.values(row).map((val: any) => {
          let str = (val || '').toString();
          // Escape quotes and wrap in quotes if contains comma
          str = str.replace(/"/g, '""');
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            str = `"${str}"`;
          }
          return str;
        });
        csvContent += values.join(',') + '\n';
      });

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-report-${fromStr}-to-${toStr}.csv"`
        }
      });
    } else if (format === 'pdf') {
      // Generate PDF
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      let page = pdfDoc.addPage([800, 600]); // Landscape page
      const { width, height } = page.getSize();

      let y = height - 50;

      // Draw Title
      page.drawText(title, { x: 50, y, size: 18, font: boldFont, color: rgb(0.1, 0.2, 0.5) });
      y -= 25;

      // Draw Filters
      page.drawText(`Date Range: ${fromStr} to ${toStr} | Generated on: ${new Date().toLocaleDateString('en-IN')}`, {
        x: 50,
        y,
        size: 10,
        font,
        color: rgb(0.4, 0.4, 0.4)
      });
      y -= 35;

      // Calculate column widths based on table headers
      const colCount = headers.length;
      const colWidth = (width - 100) / colCount;

      // Draw Table Header
      headers.forEach((h, idx) => {
        page.drawText(h, {
          x: 50 + idx * colWidth,
          y,
          size: 10,
          font: boldFont
        });
      });
      
      // Draw horizontal line below header
      y -= 5;
      page.drawLine({
        start: { x: 50, y },
        end: { x: width - 50, y },
        thickness: 1,
        color: rgb(0.1, 0.2, 0.5)
      });
      y -= 20;

      // Draw Rows
      for (const row of data) {
        if (y < 50) {
          // Add a new page
          page = pdfDoc.addPage([800, 600]);
          y = height - 50;
          
          // Re-draw Table Header
          headers.forEach((h, idx) => {
            page.drawText(h, {
              x: 50 + idx * colWidth,
              y,
              size: 10,
              font: boldFont
            });
          });
          y -= 5;
          page.drawLine({
            start: { x: 50, y },
            end: { x: width - 50, y },
            thickness: 1,
            color: rgb(0.1, 0.2, 0.5)
          });
          y -= 20;
        }

        const values = Object.values(row);
        values.forEach((v: any, idx) => {
          let str = (v || '').toString();
          // Truncate long strings to fit column width
          if (str.length > 25) {
            str = str.substring(0, 22) + '...';
          }
          page.drawText(str, {
            x: 50 + idx * colWidth,
            y,
            size: 9,
            font
          });
        });

        y -= 20;
      }

      const pdfBytes = await pdfDoc.save();
      const buffer = Buffer.from(pdfBytes);

      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${type}-report-${fromStr}-to-${toStr}.pdf"`
        }
      });
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('API Report Export Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
