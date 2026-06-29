const fs = require('fs');
const path = require('path');

function patchAdminCourses() {
  const adminPostPath = path.join(__dirname, 'app/api/admin/courses/route.ts');
  let postContent = fs.readFileSync(adminPostPath, 'utf8');

  // Add DOMPurify import if missing
  if (!postContent.includes('import DOMPurify')) {
    postContent = postContent.replace("import { slugify } from '@/lib/utils';", "import { slugify } from '@/lib/utils';\nimport DOMPurify from 'isomorphic-dompurify';");
  }

  // Patch POST unpacking
  postContent = postContent.replace(
    "logo, details, what_you_will_learn\n    } = body;",
    "logo, details, what_you_will_learn,\n      description, short_description, learning_points, requirements, target_audience, tags_array, thumbnail, preview_video, difficulty, language, certificate_enabled, estimated_completion\n    } = body;"
  );

  // Add sanitization
  const sanitizationBlock = `
    if (description) {
      description = DOMPurify.sanitize(description.toString().trim());
    }
    const safeJson = (val) => JSON.stringify(Array.isArray(val) ? val.map(i => i.toString().trim().substring(0,200)) : []);
`;
  postContent = postContent.replace(
    "slug = slugify(slug || name);",
    "slug = slugify(slug || name);\n" + sanitizationBlock
  );

  // Update INSERT query
  postContent = postContent.replace(
    "what_you_will_learn, created_at, updated_at",
    "what_you_will_learn, description, short_description, learning_points, requirements, target_audience, tags_array, thumbnail, preview_video, difficulty, language, certificate_enabled, estimated_completion, created_at, updated_at"
  );

  postContent = postContent.replace(
    ") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'published', $12, $13, $14, $15, NOW(), NOW())",
    ") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'published', $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW(), NOW())"
  );

  postContent = postContent.replace(
    "tag || null, tag_label || null, certificate_type || 'default', logo || null, JSON.stringify(details || []), what_you_will_learn || null",
    "tag || null, tag_label || null, certificate_type || 'default', logo || null, JSON.stringify(details || []), what_you_will_learn || null,\n        description || null, short_description || null, safeJson(learning_points), safeJson(requirements), safeJson(target_audience), safeJson(tags_array), thumbnail || null, preview_video || null, difficulty || null, language || null, certificate_enabled || false, estimated_completion || null"
  );

  fs.writeFileSync(adminPostPath, postContent);


  const adminPutPath = path.join(__dirname, 'app/api/admin/courses/all/route.ts');
  let putContent = fs.readFileSync(adminPutPath, 'utf8');

  if (!putContent.includes('import DOMPurify')) {
    putContent = putContent.replace("import { slugify } from '@/lib/utils';", "import { slugify } from '@/lib/utils';\nimport DOMPurify from 'isomorphic-dompurify';");
  }

  putContent = putContent.replace(
    "logo, details, what_you_will_learn\n    } = body;",
    "logo, details, what_you_will_learn,\n      description, short_description, learning_points, requirements, target_audience, tags_array, thumbnail, preview_video, difficulty, language, certificate_enabled, estimated_completion\n    } = body;"
  );

  putContent = putContent.replace(
    "slug = slugify(slug || name);",
    "slug = slugify(slug || name);\n" + sanitizationBlock
  );

  putContent = putContent.replace(
    "logo = $11,\n        details = $12,\n        what_you_will_learn = $13",
    "logo = $11,\n        details = $12,\n        what_you_will_learn = $13,\n        description = $14,\n        short_description = $15,\n        learning_points = $16,\n        requirements = $17,\n        target_audience = $18,\n        tags_array = $19,\n        thumbnail = $20,\n        preview_video = $21,\n        difficulty = $22,\n        language = $23,\n        certificate_enabled = $24,\n        estimated_completion = $25"
  );

  putContent = putContent.replace(
    "tag_label || null, certificate_type || 'default', logo || null, JSON.stringify(details || []), what_you_will_learn || null, id",
    "tag_label || null, certificate_type || 'default', logo || null, JSON.stringify(details || []), what_you_will_learn || null,\n        description || null, short_description || null, safeJson(learning_points), safeJson(requirements), safeJson(target_audience), safeJson(tags_array), thumbnail || null, preview_video || null, difficulty || null, language || null, certificate_enabled || false, estimated_completion || null,\n        id"
  );
  
  // Also fix the WHERE clause ID parameter number in the UPDATE query
  putContent = putContent.replace(
    "WHERE id = $14",
    "WHERE id = $26"
  );

  fs.writeFileSync(adminPutPath, putContent);
}

patchAdminCourses();
console.log('Patched');
