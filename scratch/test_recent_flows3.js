const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabase = createClient(env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim(), env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim());

async function check() {
  const { data } = await supabase.from('automation_flows').select('id, name, response_dm').order('created_at', { ascending: false }).limit(5);
  for (const row of data) {
    try {
      const dm = JSON.parse(row.response_dm);
      console.log(`DM Format: ${dm.greetingFormat}`);
    } catch(e) {}
  }
}
check();
