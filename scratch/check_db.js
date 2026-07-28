const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const supabaseKeyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(supabaseUrlMatch[1].trim(), supabaseKeyMatch[1].trim());

async function check() {
  const { data: detailsData } = await supabase.from('automation_flows').select('id, trigger_keyword, name, response_dm, is_active').eq('trigger_keyword', 'DETAILS').order('created_at', { ascending: false });
  const { data: rateData } = await supabase.from('automation_flows').select('id, trigger_keyword, name, response_dm, is_active').eq('trigger_keyword', 'RATE').order('created_at', { ascending: false });
  
  console.log('--- DETAILS FLOWS ---');
  console.dir(detailsData, { depth: null });
  console.log('--- RATE FLOWS ---');
  console.dir(rateData, { depth: null });
}
check();
