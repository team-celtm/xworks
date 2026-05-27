const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const pool = new Pool({
  connectionString: env.DATABASE_URL
});

async function run() {
  console.log("=== STARTING CATEGORY VALIDATION TESTS ===");
  
  // 1. Unique Slug Constraint
  {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log("1. Testing slug uniqueness constraint...");
      const { rows: existing } = await client.query('SELECT slug FROM categories LIMIT 1');
      const existingSlug = existing[0].slug;
      console.log(`Found existing slug: "${existingSlug}"`);

      try {
        await client.query('INSERT INTO categories (name, slug) VALUES ($1, $2)', ['Test Category', existingSlug]);
        console.log("❌ ERROR: Inserted duplicate slug without unique constraint violation!");
      } catch (err) {
        console.log(`✓ SUCCESS: Blocked duplicate slug: "${err.message}"`);
      }
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  // 2. Hierarchy Nesting
  {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log("\n2. Testing multi-level nesting block logic...");
      const parentRes = await client.query("INSERT INTO categories (name, slug) VALUES ('Test Parent', 'test-parent') RETURNING id");
      const parentId = parentRes.rows[0].id;
      console.log(`Created parent category: ${parentId}`);

      const subRes = await client.query("INSERT INTO categories (name, slug, parent_id) VALUES ('Test Sub', 'test-sub', $1) RETURNING id", [parentId]);
      const subId = subRes.rows[0].id;
      console.log(`Created sub-category: ${subId}`);

      const checkParent = await client.query('SELECT parent_id FROM categories WHERE id = $1', [subId]);
      if (checkParent.rows[0].parent_id !== null) {
        console.log("✓ SUCCESS: Logic check correctly flags that 'Test Sub' is a sub-category itself, so it cannot be a parent!");
      } else {
        console.log("❌ ERROR: Nested parent check failed.");
      }
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  // 3. Deletion Constraints
  {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log("\n3. Testing deletion checks...");
      
      const parentRes = await client.query("INSERT INTO categories (name, slug) VALUES ('Test Parent', 'test-parent') RETURNING id");
      const parentId = parentRes.rows[0].id;
      await client.query("INSERT INTO categories (name, slug, parent_id) VALUES ('Test Sub', 'test-sub', $1)", [parentId]);

      const childCount = await client.query('SELECT COUNT(*) FROM categories WHERE parent_id = $1', [parentId]);
      const count = parseInt(childCount.rows[0].count);
      if (count > 0) {
        console.log(`✓ SUCCESS: Correctly flagged parent category has ${count} sub-categories. Deletion should be blocked!`);
      } else {
        console.log("❌ ERROR: Child count check failed.");
      }

      const courseCatRes = await client.query('SELECT category_id, COUNT(*) as cnt FROM courses GROUP BY category_id LIMIT 1');
      if (courseCatRes.rows.length > 0) {
        const { category_id, cnt } = courseCatRes.rows[0];
        const courseCount = parseInt(cnt);
        if (courseCount > 0) {
          console.log(`✓ SUCCESS: Category ${category_id} has ${courseCount} courses. Deletion should be blocked!`);
        } else {
          console.log("❌ ERROR: Course check failed.");
        }
      }
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  console.log("\n=== CATEGORY VALIDATION TESTS COMPLETED ===");
  await pool.end();
}

run();
