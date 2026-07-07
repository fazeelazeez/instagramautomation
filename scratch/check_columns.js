const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ndlfncahseewvsehxncj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbGZuY2Foc2Vld3ZzZWh4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTY4NzEsImV4cCI6MjA5ODg5Mjg3MX0.ZDtRd4GCAyuRNrArzUqaShGVAh9TJLYEQnJFAX0o-YE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('automation_logs').select('*').limit(1);
  if (error) console.error('Error:', error.message);
  else {
    console.log('Columns found:', Object.keys(data[0] || { message: 'Table is empty, cannot see columns' }));
  }
}

checkColumns();
