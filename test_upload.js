const fs = require('fs');
console.log("Creating test file...");
fs.writeFileSync('test.txt', 'hello world');
