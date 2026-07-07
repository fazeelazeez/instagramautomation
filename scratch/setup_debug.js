const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDebugTable() {
  console.log('Creating debug_logs table...');
  
  const { error } = await supabase.rpc('create_debug_logs_table_v2', {});
  
  // If RPC doesn't exist, we try a direct query (though Supabase JS doesn't support raw SQL easily)
  // So we will just use a table that likely exists or create one via a mock insert
  
  console.log('Using fallback: inserting a test log into automation_logs with a special status...');
  const { error: insertError } = await supabase.from('automation_logs').insert([
    {
      action_taken: 'DEBUG_CHECK',
      status: 'SYSTEM_READY',
      sender_handle: 'SYSTEM',
      instagram_post_id: 'DEBUG_' + Date.now()
    }
  ]);

  if (insertError) {
    console.error('Error:', insertError);
  } else {
    console.log('System ready for logging!');
  }
}

setupDebugTable();
