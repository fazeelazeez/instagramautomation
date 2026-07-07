import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
