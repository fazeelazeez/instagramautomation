import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ndlfncahseewvsehxncj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbGZuY2Foc2Vld3ZzZWh4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTY4NzEsImV4cCI6MjA5ODg5Mjg3MX0.ZDtRd4GCAyuRNrArzUqaShGVAh9TJLYEQnJFAX0o-YE'
);

async function registerAccount() {
  const { data, error } = await supabase
    .from('instagram_accounts')
    .insert([
      {
        instagram_business_id: '17841462007877659',
        access_token: 'IGAAVo1d8HEkBBZAGJHTjlXNmw4cmdhYTAwSlZA2QzBIaHROaktjWThHQWlEcUxwV0hETFJwWjVBWHYyclMtY1haSEJDV1lHYzJsRnAtOEZAVRjZAsNENpTHg5OW5ueEs5NHAxLVprZAkRyU2NzTkFra3ZAzLW93OS1udzNLSC1pR09wUQZDZD',
        username: 'silqueendesigns',
      },
    ]);

  if (error) {
    console.error('Error registering account:', error);
  } else {
    console.log('Account registered successfully!');
  }
}

registerAccount();
