const { getAccessToken, refreshLongLivedToken, saveAccessTokenToDB } = require('./lib/token');

async function testRefresh() {
  console.log('--- TESTING TOKEN REFRESH WORKFLOW ---');
  const currentToken = await getAccessToken();
  console.log('1. Current Active Token (first 20 chars):', currentToken.substring(0, 20) + '...');

  console.log('2. Calling Meta Refresh API...');
  const refreshedToken = await refreshLongLivedToken(currentToken);

  if (refreshedToken) {
    console.log('3. Refreshed Token received from Meta! (first 20 chars):', refreshedToken.substring(0, 20) + '...');
    const saved = await saveAccessTokenToDB(refreshedToken);
    console.log('4. Saved to Supabase DB instagram_accounts table:', saved ? 'SUCCESS ✅' : 'FAILED ❌');
  } else {
    console.log('3. Meta Response: Token is a Page Access Token generated via Facebook App. Testing Facebook OAuth Exchange...');
    const fs = require('fs');
    const env = fs.readFileSync('.env', 'utf8');
    const appId = env.match(/FACEBOOK_APP_ID=(.*)/)[1].trim();
    const appSecret = env.match(/FACEBOOK_APP_SECRET=(.*)/)[1].trim();

    const fbUrl = `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;
    const res = await fetch(fbUrl);
    const data = await res.json();
    console.log('Facebook Exchange Response:', JSON.stringify(data, null, 2));

    if (data && data.access_token) {
      console.log('Refreshed Token from Facebook OAuth! (first 20 chars):', data.access_token.substring(0, 20) + '...');
      const saved = await saveAccessTokenToDB(data.access_token);
      console.log('4. Saved to Supabase DB instagram_accounts table:', saved ? 'SUCCESS ✅' : 'FAILED ❌');
    }
  }
}

testRefresh();
