const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabase = createClient(env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim(), env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim());

async function check() {
  const { data } = await supabase.from('instagram_accounts').select('*');
  console.log('--- DB INSTAGRAM ACCOUNTS ---');
  console.log(data);

  const stats = fs.statSync('.env');
  console.log('--- .env FILE MODIFIED AT ---');
  console.log(stats.mtime);
}
check();
