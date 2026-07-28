const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabaseUrlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const supabaseKeyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(supabaseUrlMatch[1].trim(), supabaseKeyMatch[1].trim());

async function check() {
  const { data } = await supabase.from('automation_flows').select('id, trigger_keyword, name').like('name', '%21 July 2026%');
  for (const row of data) {
    console.log(`Keyword: "${row.trigger_keyword}", length: ${row.trigger_keyword.length}`);
  }
}
check();
