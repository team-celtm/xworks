const fs = require('fs');
const files = [
  'app/home.css',
  'app/dashboard/dashboard.css',
  'app/catalogue/catalogue.css'
];

for (const file of files) {
  let css = fs.readFileSync(file, 'utf8');

  // 1. enrol-modal
  if (css.includes('overflow-y: auto;')) {
     css = css.replace(/\.enrol-modal\s*\{([^}]+)overflow-y:\s*auto;([^}]*)\}/, '.enrol-modal {$1display: flex;\n  flex-direction: column;$2}');
     css = css.replace(/\.catalogue-wrapper \.enrol-modal\{([^}]+)overflow-y:auto([^}]*)\}/, '.catalogue-wrapper .enrol-modal{$1display:flex;flex-direction:column$2}');
     css = css.replace(/\.shell \.enrol-modal\s*\{([^}]+)overflow-y:\s*auto;([^}]*)\}/, '.shell .enrol-modal {$1display: flex;\n  flex-direction: column;$2}');
  }

  // 2. enrol-body
  if (!css.includes('overflow-y: auto') && css.includes('.enrol-body')) {
     css = css.replace(/\.enrol-body\s*\{([\s\S]*?)padding:\s*20px 24px 24px;?/, '.enrol-body {$1padding: 20px 24px 24px;\n  overflow-y: auto;');
     css = css.replace(/\.catalogue-wrapper \.enrol-body\{([^}]+)\}/, '.catalogue-wrapper .enrol-body{$1;overflow-y:auto}');
     css = css.replace(/\.shell \.enrol-body\s*\{([\s\S]*?)padding:\s*20px 24px 24px;?/, '.shell .enrol-body {$1padding: 20px 24px 24px;\n  overflow-y: auto;');
  }

  // 3. enrol-modal-hd flex-shrink
  if (!css.includes('flex-shrink: 0')) {
     css = css.replace(/\.enrol-modal-hd\s*\{([\s\S]*?)padding:\s*24px 24px 16px;?/, '.enrol-modal-hd {$1padding: 24px 24px 16px;\n  flex-shrink: 0;');
     css = css.replace(/\.catalogue-wrapper \.enrol-modal-hd\{([^}]+)\}/, '.catalogue-wrapper .enrol-modal-hd{$1;flex-shrink:0}');
     css = css.replace(/\.shell \.enrol-modal-hd\s*\{([\s\S]*?)padding:\s*24px 24px 16px;?/, '.shell .enrol-modal-hd {$1padding: 24px 24px 16px;\n  flex-shrink: 0;');
  }

  // home.css specific fixes
  if (file === 'app/home.css') {
     css = css.replace(
       /\.enrol-format-grid\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(3,\s*1fr\);\s*gap:\s*8px;\s*margin-bottom:\s*18px\s*\}/,
       `.enrol-format-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: 18px
}

@media (min-width: 480px) {
  .enrol-format-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}`
     );

     css = css.replace(
       /\.enrol-date-grid\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(4,\s*1fr\);\s*gap:\s*8px;\s*margin-bottom:\s*16px\s*\}/,
       `.enrol-date-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px
}

@media (min-width: 400px) {
  .enrol-date-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}`
     );
  }

  fs.writeFileSync(file, css);
}
console.log('done');
