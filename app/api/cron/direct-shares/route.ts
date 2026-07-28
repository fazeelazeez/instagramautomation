import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendDirectMessageToUser } from '@/lib/instagram';

export async function GET() {
  try {
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    // Fetch all pending direct share logs created > 20 minutes ago
    const { data: pendingLogs, error } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('action_taken', 'DIRECT_SHARE_PENDING_20M')
      .lte('created_at', twentyMinsAgo);

    if (error || !pendingLogs || pendingLogs.length === 0) {
      return NextResponse.json({ message: 'No pending 20m direct share fallbacks to process.' });
    }

    console.log(`Processing ${pendingLogs.length} pending 20-minute direct share fallbacks...`);

    // Load active pricing flow or default flow
    const { data: flows } = await supabase
      .from('automation_flows')
      .select('*')
      .eq('is_active', true);

    const priceFlow = (flows || []).find(
      (f: any) =>
        f.trigger_keyword === 'PRICE' ||
        f.trigger_keyword === 'DETAILS' ||
        f.trigger_keyword === 'RATE'
    ) || (flows || [])[0];

    let processedCount = 0;

    for (const log of pendingLogs) {
      const { sender_handle, created_at, id } = log;

      if (!sender_handle) continue;

      // Check if user has commented since the direct share
      const { data: userActivity } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('sender_handle', sender_handle)
        .gte('created_at', created_at)
        .in('action_taken', ['both', 'comment_only', 'DIRECT_SHARE_COMPLETED_20M']);

      if (userActivity && userActivity.length > 0) {
        console.log(`User @${sender_handle} already commented/replied. Cancelling 20m direct fallback.`);
        await supabase
          .from('automation_logs')
          .update({ action_taken: 'DIRECT_SHARE_COMMENTED_CANCELLED' })
          .eq('id', id);
        continue;
      }

      // If user did NOT comment after 20 minutes, send direct pricing DM!
      if (priceFlow && priceFlow.response_dm) {
        try {
          await sendDirectMessageToUser(sender_handle, priceFlow.response_dm);
          console.log(`20-Minute Fallback DM sent to @${sender_handle} ✅`);

          await supabase
            .from('automation_logs')
            .update({ action_taken: 'DIRECT_SHARE_COMPLETED_20M' })
            .eq('id', id);

          processedCount++;
        } catch (dmErr) {
          console.error(`Failed to send 20m fallback DM to @${sender_handle}:`, dmErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      totalPending: pendingLogs.length
    });
  } catch (error: any) {
    console.error('Error in 20m direct share cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
