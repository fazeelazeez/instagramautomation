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
      .eq('status', 'processed')
      .in('action_taken', ['both', 'dm_only'])
      .order('created_at', { ascending: false })
      .limit(30);

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

        // Rule 1: STRICT 1-TIME FOLLOW-UP CHECK FOR USER
        const { data: existingFollowup } = await supabase
          .from('automation_logs')
          .select('id')
          .or(`sender_handle.eq.${recipientId},sender_handle.eq.${log.sender_handle}`)
          .eq('action_taken', 'followup_sent')
          .limit(1);

        if (existingFollowup && existingFollowup.length > 0) {
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
  // 2. Process Direct Share 20-Minute Price Fallbacks
  // -------------------------------------------------------------
  let directSharesProcessed = 0;
  try {
    const nowMs = Date.now();
    const twentyMinsAgo = new Date(nowMs - 20 * 60 * 1000).toISOString();

    const { data: pendingLogs } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('action_taken', 'DIRECT_SHARE_PENDING_20M')
      .lte('created_at', twentyMinsAgo)
      .order('created_at', { ascending: false })
      .limit(30);

    // Strictly enforce >= 20 minutes (1,200,000 ms) in JS Epoch time
    const validPendingLogs = (pendingLogs || []).filter((log: any) => {
      const createdMs = new Date(log.created_at).getTime();
      return (nowMs - createdMs) >= (20 * 60 * 1000);
    });

    if (validPendingLogs.length > 0) {
      const { data: flows } = await supabase.from('automation_flows').select('*').eq('is_active', true);

      const parsedFlows = (flows || []).map((f: any) => {
        let meta: any = {};
        try {
          meta = JSON.parse(f.name);
        } catch (e) {}
        return { ...f, _meta: meta };
      });

      for (const log of validPendingLogs) {
        if (!log.sender_handle) continue;
        let recipientId = log.sender_handle;

        // If log stored text username instead of numeric IGSID (older test logs), try finding numeric ID
        if (!/^\d+$/.test(recipientId)) {
          const { data: matchLogs } = await supabase
            .from('automation_logs')
            .select('sender_handle')
            .neq('sender_handle', recipientId)
            .order('created_at', { ascending: false })
            .limit(10);

          const numericMatch = (matchLogs || []).find((m: any) => m.sender_handle && /^\d+$/.test(m.sender_handle));
          if (numericMatch) {
            recipientId = numericMatch.sender_handle;
          }
        }

        // Cancel 20m fallback if customer commented OR is actively chatting in DM!
        const { data: userActivity } = await supabase
          .from('automation_logs')
          .select('id')
          .or(`sender_handle.eq.${log.sender_handle},sender_handle.eq.${recipientId}`)
          .gte('created_at', log.created_at)
          .in('action_taken', [
            'both',
            'comment_only',
            'customer_replied',
            'dm_only',
            'dm_sent_to_user',
            'DIRECT_SHARE_COMPLETED_20M'
          ]);

        if (userActivity && userActivity.length > 0) {
          console.log(`User ${recipientId} already commented or in active DM chat. Cancelling 20m fallback.`);
          await supabase.from('automation_logs').update({ action_taken: 'DIRECT_SHARE_COMMENTED_CANCELLED' }).eq('id', log.id);
          continue;
        }

        // Match exact product flow for the shared Reel URL
        const sharedUrl = log.instagram_post_id || '';
        const shortcodeMatch = sharedUrl.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/i);
        const shortcode = shortcodeMatch ? shortcodeMatch[1] : '';

        let matchedFlow: any = null;
        if (log.flow_id) {
          matchedFlow = parsedFlows.find((f: any) => f.id === log.flow_id);
        }

        if (!matchedFlow && shortcode) {
          matchedFlow = parsedFlows.find((f: any) =>
            f._meta.scope === 'single' &&
            (f._meta.postId?.includes(shortcode) || f._meta.postUrl?.includes(shortcode) || f._meta.facebookUrl?.includes(shortcode))
          );
        }

        if (!matchedFlow) {
          matchedFlow = parsedFlows.find((f: any) => f._meta.scope === 'all') ||
                        parsedFlows.find((f: any) => ['PRICE', 'DETAILS', 'RATE'].includes(f.trigger_keyword)) ||
                        parsedFlows[0];
        }

        if (matchedFlow && matchedFlow.response_dm) {
          try {
            await sendDirectMessageToUser(recipientId, matchedFlow.response_dm);
            await supabase
              .from('automation_logs')
              .update({ action_taken: 'DIRECT_SHARE_COMPLETED_20M', flow_id: matchedFlow.id })
              .eq('id', log.id);
            directSharesProcessed++;
          } catch (dmErr) {}
        }
      }
    }
  } catch (err) {
    console.error('Direct share cron portion error:', err);
  }

  // -------------------------------------------------------------
  // 3. Token Auto-Refresh (Bi-monthly on 1st & 15th)
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
    directSharesProcessed,
    tokenRefreshed
  });
}
