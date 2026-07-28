const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const tokenMatch = env.match(/INSTAGRAM_PAGE_ACCESS_TOKEN=(.*)/);
const token = tokenMatch ? tokenMatch[1].trim() : null;

async function check() {
  const url = `https://graph.facebook.com/v25.0/debug_token?input_token=${token}&access_token=${token}`;
  const response = await fetch(url);
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
check();
