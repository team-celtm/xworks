const fs = require('fs');
const files = [
  'app/catalogue/page.tsx',
  'app/page.tsx',
  'app/courses/[slug]/page.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes("import { fetchApi } from '@/lib/apiClient'")) {
    const lastImportIndex = content.lastIndexOf("import ");
    if (lastImportIndex !== -1) {
        const endOfImport = content.indexOf('\n', lastImportIndex);
        content = content.substring(0, endOfImport + 1) + "import { fetchApi } from '@/lib/apiClient';\n" + content.substring(endOfImport + 1);
    } else {
        content = "import { fetchApi } from '@/lib/apiClient';\n" + content;
    }
  }

  content = content.replace(/\bfetch\(/g, "fetchApi(");

  fs.writeFileSync(file, content);
  console.log(`Processed ${file}`);
});
