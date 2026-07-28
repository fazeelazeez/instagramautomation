import { supabase } from '@/lib/supabase';

const INSTAGRAM_BUSINESS_ID = '17841462007877659';

/**
 * Gets the current active access token.
 * Prioritizes the latest token from Supabase DB `instagram_accounts`,
 * falling back to process.env.INSTAGRAM_PAGE_ACCESS_TOKEN.
 */
export async function getAccessToken(): Promise<string> {
  try {
    const { data } = await supabase
      .from('instagram_accounts')
      .select('access_token')
      .eq('instagram_business_id', INSTAGRAM_BUSINESS_ID)
      .maybeSingle();

    if (data && data.access_token && data.access_token.trim().length > 0) {
      return data.access_token.trim();
    }
  } catch (e) {
    console.error('Failed to fetch access token from DB, using env fallback:', e);
  }

  return (process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || '').trim();
}

/**
 * Refreshes an active long-lived Instagram access token.
 * Extends validity by 60 days.
 */
export async function refreshLongLivedToken(currentToken: string): Promise<string | null> {
  if (!currentToken) return null;

  // 1. Try Instagram Graph API refresh endpoint
  try {
    const igUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`;
    const response = await fetch(igUrl);
    const data = await response.json();

    if (data && data.access_token) {
      console.log('Successfully refreshed token via Instagram Graph API ✅');
      return data.access_token;
    }
    console.warn('Instagram refresh endpoint response:', data);
  } catch (e) {
    console.error('Instagram refresh call failed:', e);
  }

  // 2. Fallback: Facebook Graph API exchange endpoint
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (appId && appSecret) {
    try {
      const fbUrl = `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;
      const response = await fetch(fbUrl);
      const data = await response.json();

      if (data && data.access_token) {
        console.log('Successfully refreshed token via Facebook Graph API ✅');
        return data.access_token;
      }
      console.warn('Facebook exchange response:', data);
    } catch (e) {
      console.error('Facebook exchange call failed:', e);
    }
  }

  return null;
}

/**
 * Updates or inserts the active access token in Supabase.
 */
export async function saveAccessTokenToDB(newToken: string): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('instagram_accounts')
      .select('id')
      .eq('instagram_business_id', INSTAGRAM_BUSINESS_ID)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('instagram_accounts')
        .update({ access_token: newToken })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('instagram_accounts')
        .insert([{
          instagram_business_id: INSTAGRAM_BUSINESS_ID,
          access_token: newToken,
          username: 'silqueendesigns'
        }]);
      if (error) throw error;
    }

    console.log('Access token saved to DB successfully ✅');
    return true;
  } catch (e) {
    console.error('Failed to save access token to DB:', e);
    return false;
  }
}
