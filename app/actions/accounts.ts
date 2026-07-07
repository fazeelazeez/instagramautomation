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

/**
 * Disconnects the Instagram account by removing all records from the 
 * instagram_accounts table.
 */
export async function disconnectAccount() {
  try {
    const { error } = await supabase
      .from('instagram_accounts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (error) {
      console.error('Error disconnecting account:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error disconnecting account:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Syncs the existing permanent token from environment variables into the database.
 * This bypasses the Facebook Login flow for internal use.
 */
export async function syncExistingToken() {
  try {
    const token = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
    if (!token) {
      return { success: false, error: 'No token found in environment variables.' };
    }

    // Step 1: Get Facebook Pages linked to this User Token
    const pagesResponse = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${token}`);
    const pagesData = await pagesResponse.json();
    console.log('Pages data:', pagesData);

    if (!pagesData.data || pagesData.data.length === 0) {
      return { success: false, error: 'No pages found. Raw: ' + JSON.stringify(pagesData) };
    }

    // Step 2: Use the Page's own token to get the Instagram Business Account
    const page = pagesData.data[0];
    const pageToken = page.access_token;
    const pageId = page.id;
    const pageName = page.name;

    const igResponse = await fetch(`https://graph.facebook.com/v20.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`);
    const igData = await igResponse.json();
    console.log('IG data:', igData);

    const igId = igData.instagram_business_account?.id;
    if (!igId) {
      return { success: false, error: 'No Instagram Business Account linked to page. Raw: ' + JSON.stringify(igData) };
    }

    // Step 3: Save the Page Token (not User Token) to Supabase
    const { error } = await supabase
      .from('instagram_accounts')
      .upsert({
        instagram_business_id: igId,
        access_token: pageToken,
        username: pageName,
      }, { onConflict: 'instagram_business_id' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Saves or updates an Instagram account in the database.
 */
export async function saveInstagramAccount(accessToken: string) {
  try {
    // 1. Get the Facebook Pages linked to this token using a more direct field search
    console.log('Fetching Pages via field search...');
    const pagesResponse = await fetch(`https://graph.facebook.com/v20.0/me?fields=accounts{id,name,instagram_business_account,access_token}&access_token=${accessToken}`);
    const rawData = await pagesResponse.json();
    console.log('Raw Meta Data:', rawData);

    const pagesData = rawData.accounts;

    if (!pagesData || !pagesData.data || pagesData.data.length === 0) {
      console.error('No pages found in Meta response');
      return { 
        success: false, 
        error: 'No Facebook Pages found linked to this account.',
        debug: JSON.stringify(rawData)
      };
    }

    // 2. For the first page, get the Instagram Business Account ID
    const page = pagesData.data[0];
    console.log('Using page:', page.name, page.id);
    const igResponse = await fetch(`https://graph.facebook.com/v20.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`);
    const igData = await igResponse.json();
    console.log('Instagram Data:', igData);

    const igId = igData.instagram_business_account?.id;
    if (!igId) {
      return { success: false, error: 'No Instagram Business Account linked to the selected Page.' };
    }

    // 3. Save to Supabase
    const { error } = await supabase
      .from('instagram_accounts')
      .upsert({
        instagram_business_id: igId,
        access_token: accessToken,
        username: page.name, // Using page name as placeholder
      }, { onConflict: 'instagram_business_id' });

    if (error) {
      console.error('Database error saving account:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error saving account:', error);
    return { success: false, error: error.message };
  }
}
