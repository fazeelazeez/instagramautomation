const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const tokenMatch = env.match(/INSTAGRAM_PAGE_ACCESS_TOKEN=(.*)/);
const token = tokenMatch ? tokenMatch[1].trim() : null;

async function check() {
  const mediaId = '17841966702085601'; // Mock or valid? Let's just try the /me endpoints to see if permissions are there
  const url = `https://graph.instagram.com/v25.0/me/media?access_token=${token}`;
  const response = await fetch(url);
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2).substring(0, 500));
}
check();
