const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabase = createClient(env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim(), env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim());

async function check() {
  const { data } = await supabase.from('instagram_accounts').select('instagram_business_id, access_token, username').eq('instagram_business_id', '17841462007877659');
  console.log('Database Account Record:');
  console.log(data);
}
check();
