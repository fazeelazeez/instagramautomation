const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function saveToken() {
  const env = fs.readFileSync('.env', 'utf8');
  const currentToken = env.match(/INSTAGRAM_PAGE_ACCESS_TOKEN=(.*)/)[1].trim();
  const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

  const supabase = createClient(supabaseUrl, supabaseKey);

  const igUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`;
  const res = await fetch(igUrl);
  const data = await res.json();

  if (data && data.access_token) {
    console.log('Refreshed Token from Meta:', data.access_token.substring(0, 30) + '...');
    console.log('Expires in:', data.expires_in, 'seconds (60 Days)');

    const { data: existing } = await supabase
      .from('instagram_accounts')
      .select('id')
      .eq('instagram_business_id', '17841462007877659')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('instagram_accounts')
        .update({ access_token: data.access_token })
        .eq('id', existing.id);
      if (error) console.error('Error updating DB:', error);
      else console.log('Successfully updated Supabase DB with refreshed token! ✅');
    }
  } else {
    console.log('Failed to refresh:', data);
  }
}

saveToken();
