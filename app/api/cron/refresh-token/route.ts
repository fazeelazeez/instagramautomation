import { NextResponse } from 'next/server';
import { getAccessToken, refreshLongLivedToken, saveAccessTokenToDB } from '@/lib/token';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  // Verify Vercel Cron secret header if configured
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('Running automatic Instagram token refresh cron job...');

  try {
    const currentToken = await getAccessToken();
    if (!currentToken) {
      console.error('No active access token found to refresh.');
      return NextResponse.json({ error: 'No active token found' }, { status: 400 });
    }

    const refreshedToken = await refreshLongLivedToken(currentToken);

    if (refreshedToken) {
      const saved = await saveAccessTokenToDB(refreshedToken);

      // Log token refresh action
      try {
        await supabase.from('automation_logs').insert([{
          flow_id: null,
          instagram_post_id: 'TOKEN_REFRESH_' + Date.now(),
          sender_handle: 'SYSTEM_CRON',
          action_taken: 'token_refreshed',
          status: saved ? 'success' : 'db_save_failed'
        }]);
      } catch (logErr) {}

      console.log('Token refresh workflow completed successfully ✅');
      return NextResponse.json({ success: true, message: 'Token refreshed successfully' });
    } else {
      console.warn('Meta API did not return a refreshed token. Token may already be long-lived Page token.');
      return NextResponse.json({ success: false, message: 'Token refresh skipped or unneeded' });
    }
  } catch (err: any) {
    console.error('Token refresh cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
