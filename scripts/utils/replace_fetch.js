const fs = require('fs');
const files = [
  'app/admin/page.tsx',
  'app/dashboard/page.tsx',
  'app/instructor/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Add import if not present
  if (!content.includes("import { fetchApi } from '@/lib/apiClient'")) {
    // find last import
    const lastImportIndex = content.lastIndexOf("import ");
    const endOfImport = content.indexOf('\n', lastImportIndex);
    content = content.substring(0, endOfImport + 1) + "import { fetchApi } from '@/lib/apiClient';\n" + content.substring(endOfImport + 1);
  }

  // Replace fetch( with fetchApi(
  // We need to be careful with things like err.fetch() which don't exist, but window.fetch or just fetch(
  // Let's use regex: \bfetch\(
  content = content.replace(/\bfetch\(/g, "fetchApi(");

  // Fix unhandled promises in admin page
  if (file === 'app/admin/page.tsx') {
    // Add catch to .then(d => setStats(d));
    content = content.replace(/then\(d => setStats\(d\)\);/g, "then(d => setStats(d)).catch(e => console.error(e));");
    content = content.replace(/then\(d => setApplications\(d\.applications \|\| \[\]\)\);/g, "then(d => setApplications(d.applications || [])).catch(e => console.error(e));");
    content = content.replace(/then\(d => setCourses\(d\.courses \|\| \[\]\)\);/g, "then(d => setCourses(d.courses || [])).catch(e => console.error(e));");
    content = content.replace(/then\(d => setPromos\(d\.promos \|\| \[\]\)\);/g, "then(d => setPromos(d.promos || [])).catch(e => console.error(e));");
    content = content.replace(/then\(d => setAllInstructors\(d\.instructors \|\| \[\]\)\);/g, "then(d => setAllInstructors(d.instructors || [])).catch(e => console.error(e));");
    
    // Add double submit prevention
    content = content.replace(
      "const handlePublishCourse = async (id: string, action: 'approve' | 'reject') => {",
      "const handlePublishCourse = async (id: string, action: 'approve' | 'reject') => {\n    if (actioningCourseId) return;"
    );
    content = content.replace(
      "const handleApproveInstructor = async (id: string, action: 'approve' | 'reject') => {",
      "const handleApproveInstructor = async (id: string, action: 'approve' | 'reject') => {\n    if (actioningInstructorId) return;"
    );
  }

  if (file === 'app/instructor/page.tsx') {
    content = content.replace(/then\(d => setAllCategories\(d \|\| \[\]\)\);/g, "then(d => setAllCategories(d || [])).catch(e => console.error(e));");
  }

  fs.writeFileSync(file, content);
  console.log(`Processed ${file}`);
});
