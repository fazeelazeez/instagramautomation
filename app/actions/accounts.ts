'use server';

import { supabase } from '@/lib/supabase';

/**
 * Checks if there is at least one Instagram account linked in the database.
 * Since this is an internal-use tool for a single business, we just check
 * if any record exists in the instagram_accounts table.
 */
export async function isAccountLinked() {
  try {
    const { count, error } = await supabase
      .from('instagram_accounts')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error checking account link status:', error);
      return false;
    }

    return (count ?? 0) > 0;
  } catch (error) {
    console.error('Unexpected error checking account link status:', error);
    return false;
  }
}
