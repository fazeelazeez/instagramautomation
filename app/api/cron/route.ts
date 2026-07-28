import { NextResponse } from 'next/server';
import { getAccessToken, refreshLongLivedToken, saveAccessTokenToDB } from '@/lib/token';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('Running daily cron job for Meta access token auto-refresh...');

  let tokenRefreshed = false;
  const dayOfMonth = new Date().getDate();

  // Refresh token bi-monthly (1st and 15th of the month)
  if (dayOfMonth === 1 || dayOfMonth === 15) {
    try {
      const currentToken = await getAccessToken();
      if (currentToken) {
        const refreshedToken = await refreshLongLivedToken(currentToken);
        if (refreshedToken) {
          tokenRefreshed = await saveAccessTokenToDB(refreshedToken);
          
          try {
            await supabase.from('automation_logs').insert([{
              flow_id: null,
              instagram_post_id: 'CRON_TOKEN_REFRESH_' + Date.now(),
              sender_handle: 'SYSTEM_CRON',
              action_taken: 'token_refreshed',
              status: tokenRefreshed ? 'success' : 'failed'
            }]);
          } catch (logErr) {}
        }
      }
    } catch (err: any) {
      console.error('Token refresh cron error:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    tokenRefreshed,
    message: tokenRefreshed ? 'Token refreshed successfully' : 'Daily check complete'
  });
}
