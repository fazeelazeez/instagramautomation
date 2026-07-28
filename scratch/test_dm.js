const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const tokenMatch = env.match(/INSTAGRAM_PAGE_ACCESS_TOKEN=(.*)/);
const token = tokenMatch ? tokenMatch[1].trim() : null;

async function check() {
  const url = `https://graph.instagram.com/v25.0/17841462007877659/messages`;
  const payload = {
    recipient: { comment_id: "123456789" },
    message: { text: "Hello from test" }
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
