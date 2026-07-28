import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendDirectMessageToUser } from '@/lib/instagram';
import { getAccessToken, refreshLongLivedToken, saveAccessTokenToDB } from '@/lib/token';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('Running daily cron job (Smart 1-Time 24h DM Follow-ups & Token Refresh)...');

  let followUpsSent = 0;
  let tokenRefreshed = false;

  // -------------------------------------------------------------
  // 1. Process Smart 1-Time 24-Hour DM Follow-ups
  // -------------------------------------------------------------
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: logs, error: logsError } = await supabase
      .from('automation_logs')
      .select('*, automation_flows(*)')
      .lte('created_at', twentyFourHoursAgo)
      .eq('status', 'processed');

    if (!logsError && logs) {
      for (const log of logs) {
        const flow = log.automation_flows;
        const recipientId = log.sender_handle;

        if (!flow || !flow.response_dm || !recipientId || recipientId === 'META' || recipientId.startsWith('RAW_') || recipientId === 'SYSTEM_CRON') {
          continue;
        }

        let followUpEnabled = false;
        let followUpText = '';

        try {
          if (flow.response_dm.startsWith('{') || flow.response_dm.startsWith('[')) {
            const parsed = JSON.parse(flow.response_dm);
            followUpEnabled = !!parsed.followUp;
            followUpText = parsed.followUpText || '';
          }
        } catch (e) {}

        if (!followUpEnabled || !followUpText) continue;

        // Rule 1: STRICT 1-TIME FOLLOW-UP CHECK
        const { data: existingFollowup } = await supabase
          .from('automation_logs')
          .select('id')
          .eq('flow_id', flow.id)
          .eq('sender_handle', recipientId)
          .eq('action_taken', 'followup_sent')
          .maybeSingle();

        if (existingFollowup) {
          console.log(`Skipping 24h follow-up for ${recipientId}: Follow-up already sent 1-time!`);
          continue;
        }

        // Rule 2: AUTO-CANCEL IF CUSTOMER REPLIED
        const { data: customerReply } = await supabase
          .from('automation_logs')
          .select('id')
          .eq('sender_handle', recipientId)
          .eq('action_taken', 'customer_replied')
          .gte('created_at', log.created_at)
          .maybeSingle();

        if (customerReply) {
          console.log(`Canceling 24h follow-up for ${recipientId}: Customer already replied!`);
          continue;
        }

        console.log(`Sending 1-time 24h follow-up DM to ${recipientId}: "${followUpText}"`);

        try {
          await sendDirectMessageToUser(recipientId, followUpText);
          followUpsSent++;

          await supabase.from('automation_logs').insert([{
            flow_id: flow.id,
            instagram_post_id: 'FOLLOWUP_' + Date.now(),
            sender_handle: recipientId,
            action_taken: 'followup_sent',
            status: 'processed'
          }]);
        } catch (err) {
          console.error(`Failed 24h follow-up to ${recipientId}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('Follow-up cron portion error:', err);
  }

  // -------------------------------------------------------------
  // 2. Token Auto-Refresh (Bi-monthly on 1st & 15th)
  // -------------------------------------------------------------
  const dayOfMonth = new Date().getDate();
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
    } catch (tokenErr) {
      console.error('Token refresh cron error:', tokenErr);
    }
  }

  return NextResponse.json({
    success: true,
    followUpsSent,
    tokenRefreshed
  });
}
