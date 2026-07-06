import { createClient } from '@supabase/supabase-js';

// Hardcoded for production convenience as requested
const supabaseUrl = 'https://ndlfncahseewvsehxncj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbGZuY2Foc2Vld3ZzZWh4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTY4NzEsImV4cCI6MjA5ODg5Mjg3MX0.ZDtRd4GCAyuRNrArzUqaShGVAh9TJLYEQnJFAX0o-YE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
