import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const steps: string[] = [];
  try {
    // Schema checks (idempotent)
    await pool.query('CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL, status TEXT DEFAULT \'active\')');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT \'learner\'');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT \'{}\'::jsonb');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    await pool.query('CREATE TABLE IF NOT EXISTS categories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT UNIQUE, name TEXT)');
    await pool.query('CREATE TABLE IF NOT EXISTS courses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, slug TEXT UNIQUE, cat TEXT, g TEXT, category_id UUID REFERENCES categories(id))');
    await pool.query('CREATE TABLE IF NOT EXISTS enrolments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id), course_id UUID REFERENCES courses(id), status TEXT, progress_pct NUMERIC, completed_at TIMESTAMP WITH TIME ZONE)');
    await pool.query('CREATE TABLE IF NOT EXISTS certificates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), credential_id TEXT UNIQUE NOT NULL, user_id UUID REFERENCES users(id), course_id UUID REFERENCES courses(id), enrolment_id UUID REFERENCES enrolments(id), status TEXT DEFAULT \'issued\', issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())');
    await pool.query('CREATE TABLE IF NOT EXISTS notes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, workshop_id UUID REFERENCES courses(id) ON DELETE SET NULL, title TEXT, content TEXT, tags TEXT[], is_pinned BOOLEAN DEFAULT false, updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())');
    
    // Ensure demo user exists
    const demoEmail = 'demo@xworks.com';
    let { rows: usr } = await pool.query("SELECT id FROM users WHERE email = $1", [demoEmail]);
    if (usr.length === 0) {
      const { rows: newUser } = await pool.query("INSERT INTO users (email, first_name, last_name, role) VALUES ($1, 'Demo', 'User', 'learner') RETURNING id", [demoEmail]);
      usr = newUser;
      steps.push('Created demo user: ' + demoEmail);
    }

    await pool.query("INSERT INTO categories (slug, name) VALUES ('tech', 'Tech') ON CONFLICT DO NOTHING");
    const { rows: cats } = await pool.query("SELECT id FROM categories LIMIT 1");

    await pool.query(`INSERT INTO courses (name, slug, cat, g, category_id) 
      VALUES ('React Native Mastery', 'react-native', 'tech', 'g-ai', $1)
      ON CONFLICT (slug) DO NOTHING`, [cats[0].id]);
    const { rows: crs } = await pool.query("SELECT id FROM courses WHERE slug = 'react-native'");

    if (usr.length > 0 && crs.length > 0) {
      const uId = usr[0].id;
      const cId = crs[0].id;

      // Upsert Enrolment
      const { rows: enrols } = await pool.query(`
        INSERT INTO enrolments (user_id, course_id, status, progress_pct, completed_at)
        VALUES ($1, $2, 'completed', 100, NOW())
        ON CONFLICT ON CONSTRAINT uq_enrolment DO UPDATE SET status = 'completed', progress_pct = 100, completed_at = NOW()
        RETURNING id
      `, [uId, cId]).catch(async (e) => {
        // Fallback if constraint name is different
        return await pool.query("SELECT id FROM enrolments WHERE user_id = $1 AND course_id = $2", [uId, cId]);
      });

      const eId = enrols[0].id;
      const credId = `XW-CERT-${Math.floor(Math.random()*90000)+10000}`;
      
      await pool.query(`
        INSERT INTO certificates (credential_id, user_id, course_id, enrolment_id, status)
        VALUES ($1, $2, $3, $4, 'issued')
        ON CONFLICT DO NOTHING
      `, [credId, uId, cId, eId]);
      
      await pool.query(`
        INSERT INTO notes (user_id, workshop_id, title, content, tags, is_pinned)
        VALUES ($1, $2, 'My Journey at XWORKS', 'I am excited to start my first workshop on React Native. I need to focus on state management and navigation hooks.', ARRAY['learning', 'intro'], true)
        ON CONFLICT DO NOTHING
      `, [uId, cId]);

      steps.push('Generated certificate: ' + credId);
      steps.push('Added sample note for demo user');
    }

    return NextResponse.json({ message: 'Seeding successful', steps }, { status: 200 });
  } catch (error: any) {
    console.error('Seeding Error:', error.message);
    return NextResponse.json({ error: error.message, steps }, { status: 500 });
  }
}
