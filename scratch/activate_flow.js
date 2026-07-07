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

async function activateFlow() {
  console.log('Activating "PRICE" flow...');
  const { data, error } = await supabase
    .from('automation_flows')
    .update({ is_active: true })
    .eq('trigger_keyword', 'PRICE');

  if (error) {
    console.error('Error activating flow:', error);
  } else {
    console.log('Flow activated successfully!');
  }
}

activateFlow();
