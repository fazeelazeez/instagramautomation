const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const tokenMatch = env.match(/INSTAGRAM_PAGE_ACCESS_TOKEN=(.*)/);
const token = tokenMatch ? tokenMatch[1].trim() : null;
const BUSINESS_ID = '17841462007877659';

async function check() {
  const url = `https://graph.instagram.com/v25.0/${BUSINESS_ID}/messages`;
  const payload = {
    recipient: { comment_id: "18606961951061436" },
    message: { text: "Hello from developer test" }
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
check();
