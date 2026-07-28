import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendDirectMessageToUser } from '@/lib/instagram';

export async function GET(request: Request) {
  // Verify Vercel Cron secret header if configured
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('Running 24-hour DM follow-up cron job...');

  try {
    // 24 hours ago window (between 23 and 25 hours ago)
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();

    // Query DM logs sent in that window
    const { data: logs, error: logsError } = await supabase
      .from('automation_logs')
      .select('*, automation_flows(*)')
      .gte('created_at', twentyFiveHoursAgo)
      .lte('created_at', twentyThreeHoursAgo)
      .eq('status', 'processed');

    if (logsError) {
      console.error('Error fetching logs for follow-up:', logsError);
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    let followUpsSent = 0;

    for (const log of (logs || [])) {
      const flow = log.automation_flows;
      const recipientId = log.sender_handle;

      if (!flow || !flow.response_dm || !recipientId || recipientId === 'META' || recipientId.startsWith('RAW_')) {
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

      // Check if follow-up was already sent for this log / flow
      const { data: existingFollowup } = await supabase
        .from('automation_logs')
        .select('id')
        .eq('flow_id', flow.id)
        .eq('sender_handle', recipientId)
        .eq('action_taken', 'followup_sent')
        .maybeSingle();

      if (existingFollowup) {
        console.log(`Follow-up already sent to ${recipientId} for flow ${flow.id}`);
        continue;
      }

      console.log(`Sending 24h follow-up DM to ${recipientId}: "${followUpText}"`);

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
        console.error(`Failed to send 24h follow-up to ${recipientId}:`, err);
      }
    }

    return NextResponse.json({ success: true, followUpsSent });
  } catch (err: any) {
    console.error('Follow-up cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
