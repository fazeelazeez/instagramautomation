import { NextResponse } from 'next/server';
import { sendInstagramDM, replyToComment } from '@/lib/instagram';
import { supabase } from '@/lib/supabase';

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'silqueen_automation_2026';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return new Response(challenge, { status: 200 });
  } else {
    return new Response('Verification failed', { status: 403 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  console.log('Received Webhook:', JSON.stringify(body, null, 2));

  // IMPORTANT: On Vercel, we MUST await before returning — background tasks get killed instantly!
  // Meta allows up to 20 seconds for a response, so this is safe.
  try {
    await processWebhook(body);
  } catch (err) {
    console.error('Webhook processing error:', err);
  }

  // Always return 200 to Meta
  return NextResponse.json({ status: 'success' });
}

async function processWebhook(body: any) {
  // Log raw incoming webhook — wrapped safely
  try {
    await supabase.from('automation_logs').insert([{
      action_taken: 'RAW_WEBHOOK_RECEIVED',
      status: 'received',
      sender_handle: 'META',
      instagram_post_id: 'RAW_' + Date.now()
    }]);
  } catch (logErr) {
    console.error('DB log failed (non-critical):', logErr);
  }

  if (body.object !== 'instagram') {
    console.log('Not an Instagram event, skipping.');
    return;
  }

  for (const entry of (body.entry || [])) {
    for (const change of (entry.changes || [])) {
      if (change.field !== 'comments') continue;

      const commentData = change.value;
      if (!commentData?.text || !commentData?.from?.id) {
        console.log('Comment data incomplete, skipping.');
        continue;
      }

      const commentText = commentData.text.trim().toUpperCase();
      const commentId = commentData.id;
      const fromId = commentData.from.id;
      const fromUsername = commentData.from.username || 'unknown';

      console.log(`Processing comment: "${commentText}" from @${fromUsername}`);

      // Anti-spam check — wrapped safely so it never blocks the flow
      try {
        const { data: existingLog } = await supabase
          .from('automation_logs')
          .select('id')
          .eq('instagram_post_id', commentId)
          .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors

        if (existingLog) {
          console.log('Already processed comment:', commentId);
          continue;
        }
      } catch (spamErr) {
        console.error('Anti-spam check failed (continuing anyway):', spamErr);
        // Don't return — continue processing even if this check fails
      }

      // Find matching automation flow
      let flow: any = null;
      try {
        const { data } = await supabase
          .from('automation_flows')
          .select('*')
          .eq('trigger_keyword', commentText)
          .eq('is_active', true)
          .maybeSingle();
        flow = data;
      } catch (flowErr) {
        console.error('Flow lookup failed:', flowErr);
      }

      if (!flow) {
        console.log(`No active flow found for keyword: "${commentText}"`);
        continue;
      }

      console.log('Flow matched! Executing:', flow.name);

      // Reply to comment
      if (flow.response_comment) {
        try {
          await replyToComment(commentId, flow.response_comment);
          console.log('Comment reply sent ✅');
        } catch (err) {
          console.error('Failed to reply to comment:', err);
        }
      }

      // Send DM
      if (flow.response_dm) {
          try {
            await sendInstagramDM(commentId, flow.response_dm);
            console.log('DM sent ✅');
          } catch (err) {
            console.error('Failed to send DM:', err);
          }
        }

      // Log success
      try {
        await supabase.from('automation_logs').insert([{
          flow_id: flow.id,
          instagram_post_id: commentId,
          sender_handle: fromUsername,
          action_taken: 'both',
          status: 'processed'
        }]);
        console.log('Success logged to DB ✅');
      } catch (logErr) {
        console.error('Failed to log success (non-critical):', logErr);
      }
    }
  }
}
