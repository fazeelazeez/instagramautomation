const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://ndlfncahseewvsehxncj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbGZuY2Foc2Vld3ZzZWh4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTY4NzEsImV4cCI6MjA5ODg5Mjg3MX0.ZDtRd4GCAyuRNrArzUqaShGVAh9TJLYEQnJFAX0o-YE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFlows() {
  const { data, error } = await supabase.from('automation_flows').select('*');
  if (error) console.error('Error:', error);
  else console.log('Active Flows:', JSON.stringify(data, null, 2));
}

checkFlows();
