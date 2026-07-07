const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ndlfncahseewvsehxncj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbGZuY2Foc2Vld3ZzZWh4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTY4NzEsImV4cCI6MjA5ODg5Mjg3MX0.ZDtRd4GCAyuRNrArzUqaShGVAh9TJLYEQnJFAX0o-YE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Attempting simple insert...');
  const { data, error } = await supabase.from('automation_logs').insert([
    { action_taken: 'MANUAL_TEST_PROBE' }
  ]);
  
  if (error) {
    console.error('INSERT FAILED! ❌');
    console.error('Error Message:', error.message);
    console.error('Error Details:', error.details);
  } else {
    console.log('INSERT SUCCESS! ✅');
  }
}

testInsert();
