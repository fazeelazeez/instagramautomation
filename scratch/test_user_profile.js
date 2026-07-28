const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const token = env.match(/INSTAGRAM_PAGE_ACCESS_TOKEN=(.*)/)[1].trim();

async function testFetchUsername() {
  const userId = '17841462007877659';
  const url = `https://graph.instagram.com/v25.0/${userId}?fields=username&access_token=${token}`;
  
  const response = await fetch(url);
  const data = await response.json();
  console.log('Fetch username response for ID:', userId);
  console.log(JSON.stringify(data, null, 2));
}

testFetchUsername();
