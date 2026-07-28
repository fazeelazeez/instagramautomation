import fs from 'fs';

async function testRefresh() {
  console.log('--- TESTING META REFRESH ENDPOINT ---');
  const env = fs.readFileSync('.env', 'utf8');
  const currentToken = env.match(/INSTAGRAM_PAGE_ACCESS_TOKEN=(.*)/)[1].trim();
  const appId = env.match(/FACEBOOK_APP_ID=(.*)/)[1].trim();
  const appSecret = env.match(/FACEBOOK_APP_SECRET=(.*)/)[1].trim();

  console.log('Active Token (first 25 chars):', currentToken.substring(0, 25) + '...');

  // 1. Instagram Graph API refresh endpoint
  const igUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`;
  const igRes = await fetch(igUrl);
  const igData = await igRes.json();
  console.log('\n--- 1. Instagram Graph API Refresh Response ---');
  console.log(JSON.stringify(igData, null, 2));

  // 2. Facebook Graph API exchange endpoint
  const fbUrl = `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;
  const fbRes = await fetch(fbUrl);
  const fbData = await fbRes.json();
  console.log('\n--- 2. Facebook Graph API OAuth Exchange Response ---');
  console.log(JSON.stringify(fbData, null, 2));
}

testRefresh();
