/* eslint-disable @typescript-eslint/no-require-imports */
const https = require('https');

https.get('https://www.teluguone.com/news/rss/latestnews/latestnews-25.rss', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data.substring(0, 3000)); // print first 3000 chars of RSS
  });
}).on('error', (e) => {
  console.error(e);
});
