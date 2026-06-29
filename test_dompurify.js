const DOMPurify = require('isomorphic-dompurify');
const dirty = '<p style="font-size: 14px; font-family: Inter; line-height: 1.5; padding-left: 24px; color: red;">Test</p>';
console.log(DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } }));
