const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        processDirectory(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // Replace process.env.SESSION_SECRET || 'your-default-secret-change-me'
      if (content.includes("process.env.SESSION_SECRET || 'your-default-secret-change-me'")) {
        content = content.replace(/process\.env\.SESSION_SECRET \|\| 'your-default-secret-change-me'/g, "process.env.SESSION_SECRET!");
        modified = true;
      }
      if (content.includes('process.env.SESSION_SECRET || "your-default-secret-change-me"')) {
        content = content.replace(/process\.env\.SESSION_SECRET \|\| "your-default-secret-change-me"/g, "process.env.SESSION_SECRET!");
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

console.log('Replacing hardcoded fallback secrets...');
processDirectory('./app');
processDirectory('./lib');
console.log('Done!');
