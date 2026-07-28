const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabase = createClient(env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim(), env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim());

async function check() {
  const { data } = await supabase.from('automation_logs').select('id, instagram_post_id, created_at').eq('sender_handle', 'META').order('created_at', { ascending: false }).limit(5);
  console.log(data);
}
check();
