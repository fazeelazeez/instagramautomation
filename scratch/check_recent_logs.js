const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple parser for .env file
const env = fs.readFileSync('.env', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
  console.log('Checking recent automation logs...');
  const { data: logs, error } = await supabase
    .from('automation_logs')
    .select('*, automation_flows(name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log('No logs found in the database.');
  } else {
    console.log('Recent Logs:');
    logs.forEach(log => {
      console.log(`- Time: ${log.created_at}`);
      console.log(`  Flow: ${log.automation_flows?.name || 'Unknown'}`);
      console.log(`  User: ${log.sender_handle}`);
      console.log(`  Status: ${log.status}`);
      console.log('-------------------');
    });
  }
}

checkLogs();
