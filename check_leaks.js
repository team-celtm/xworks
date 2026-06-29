const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('pool.connect')) {
    const connects = (content.match(/pool\.connect\(\)/g) || []).length;
    const releases = (content.match(/\.release\(\)/g) || []).length;
    if (connects > releases) {
      console.log(`POTENTIAL LEAK IN ${filePath}: connects=${connects}, releases=${releases}`);
    } else {
      console.log(`OK: ${filePath} connects=${connects}, releases=${releases}`);
    }
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      checkFile(fullPath);
    }
  }
}

walkDir('./app');
