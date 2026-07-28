const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabase = createClient(env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim(), env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim());

async function check() {
  const { data } = await supabase.from('automation_flows').select('*');
  console.log('--- ALL AUTOMATION FLOWS IN DB ---');
  console.log(`Total Flows Count: ${data ? data.length : 0}`);
  if (data) {
    data.forEach(f => {
      console.log(`ID: ${f.id} | Trigger Keyword: "${f.trigger_keyword}" | Is Active: ${f.is_active} | Name: ${f.name}`);
    });
  }
}
check();
