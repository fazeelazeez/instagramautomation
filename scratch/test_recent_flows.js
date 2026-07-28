const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabase = createClient(env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim(), env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim());

async function check() {
  const { data } = await supabase.from('automation_flows').select('id, trigger_keyword, name, response_dm').order('created_at', { ascending: false }).limit(5);
  for (const row of data) {
    console.log(`Keyword: ${row.trigger_keyword}`);
    try {
      const dm = JSON.parse(row.response_dm);
      console.log(`DM Text Length: ${dm.text ? dm.text.length : 0}`);
      console.log(`DM Text: ${dm.text}`);
    } catch(e) {
      console.log('Error parsing DM', e);
    }
  }
}
check();
