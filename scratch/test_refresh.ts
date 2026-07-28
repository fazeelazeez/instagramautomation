import { getAccessToken, refreshLongLivedToken, saveAccessTokenToDB } from './lib/token';
import { supabase } from './lib/supabase';
import fs from 'fs';

async function testRefresh() {
  console.log('--- TESTING TOKEN REFRESH WORKFLOW ---');
  const currentToken = await getAccessToken();
  console.log('1. Current Active Token (first 25 chars):', currentToken.substring(0, 25) + '...');

  console.log('2. Calling Meta Refresh APIs...');
  
  // Test Instagram Graph API refresh endpoint
  const igUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`;
  const igRes = await fetch(igUrl);
  const igData = await igRes.json();
  console.log('Instagram Graph API Response:', JSON.stringify(igData, null, 2));

  // Test Facebook Graph API Exchange endpoint
  const env = fs.readFileSync('.env', 'utf8');
  const appId = env.match(/FACEBOOK_APP_ID=(.*)/)[1].trim();
  const appSecret = env.match(/FACEBOOK_APP_SECRET=(.*)/)[1].trim();

  const fbUrl = `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;
  const fbRes = await fetch(fbUrl);
  const fbData = await fbRes.json();
  console.log('Facebook Graph API Exchange Response:', JSON.stringify(fbData, null, 2));

  const newToken = igData?.access_token || fbData?.access_token;
  if (newToken) {
    console.log('3. Refreshed Token obtained! Saving to Supabase DB instagram_accounts...');
    const saved = await saveAccessTokenToDB(newToken);
    console.log('4. Supabase DB update status:', saved ? 'SUCCESS ✅' : 'FAILED ❌');
  } else {
    console.log('3. Information: Token is a Never-Expiring Page Access Token or does not require manual exchange.');
  }
}

testRefresh();
