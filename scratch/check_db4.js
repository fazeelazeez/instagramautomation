const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabase = createClient(env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim(), env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim());

async function check() {
  const { data } = await supabase.from('automation_flows').select('id, trigger_keyword, response_dm').like('name', '%21 July 2026%');
  for (const row of data) {
    console.log(`\nKeyword: ${row.trigger_keyword}`);
    console.log(`DM: ${row.response_dm}`);
  }
}
check();
