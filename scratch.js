const bcrypt = require('bcryptjs');
const dummyHash = '$2b$10$EpR0S3.9/iH6E/XyJ1f9IepN09Zg3k9J.cOq9S6a/Tq8n6G0lKz0e';
console.time('compare');
bcrypt.compare('testpassword', dummyHash).then(res => {
  console.timeEnd('compare');
  console.log(res);
});
