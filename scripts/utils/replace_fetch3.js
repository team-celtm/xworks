const fs = require('fs');
const path = require('path');

function replaceFetch(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      replaceFetch(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.includes('fetch(') && !content.includes('import { fetchApi }')) {
        const lastImportIndex = content.lastIndexOf("import ");
        if (lastImportIndex !== -1) {
          const endOfImport = content.indexOf('\n', lastImportIndex);
          content = content.substring(0, endOfImport + 1) + "import { fetchApi } from '@/lib/apiClient';\n" + content.substring(endOfImport + 1);
        } else {
          content = "import { fetchApi } from '@/lib/apiClient';\n" + content;
        }
      }
      
      content = content.replace(/\bfetch\(/g, "fetchApi(");
      fs.writeFileSync(fullPath, content);
      console.log(`Processed ${fullPath}`);
    }
  }
}

replaceFetch('./app/components');
