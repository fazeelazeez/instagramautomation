const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ndlfncahseewvsehxncj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbGZuY2Foc2Vld3ZzZWh4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTY4NzEsImV4cCI6MjA5ODg5Mjg3MX0.ZDtRd4GCAyuRNrArzUqaShGVAh9TJLYEQnJFAX0o-YE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function discoverTables() {
  // Try to query a common schema table
  const { data, error } = await supabase.from('automation_flows').select('id').limit(1);
  if (error) {
    console.error('Connection Error:', error.message);
  } else {
    console.log('Database Connection: SUCCESS ✅');
    // Try to see if automation_logs exists
    const { error: logError } = await supabase.from('automation_logs').select('id').limit(1);
    if (logError) {
      console.log('Table "automation_logs" status: NOT FOUND or BLOCKED ❌');
    } else {
      console.log('Table "automation_logs" status: EXISTS ✅');
    }
  }
}

discoverTables();
