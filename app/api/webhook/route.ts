import { NextResponse } from 'next/server';
import { sendInstagramDM, replyToComment, getMediaShortcode } from '@/lib/instagram';
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

      // Find matching automation flows
      let matchedFlows: any[] = [];
      try {
        const { data } = await supabase
          .from('automation_flows')
          .select('*')
          .eq('trigger_keyword', commentText)
          .eq('is_active', true);
        if (data) matchedFlows = data;
      } catch (flowErr) {
        console.error('Flow lookup failed:', flowErr);
      }

      let flow: any = null;
      const mediaId = commentData.media?.id;
      let mediaShortcode: string | null = null;

      if (matchedFlows.length > 0) {
        // We might have multiple flows for the same keyword.
        // We parse their JSON names to find their scope and prioritize:
        const parsedFlows = matchedFlows.map(f => {
          let parsedMeta: any = { scope: 'all', postId: null };
          try {
            if (f.name.startsWith('{')) parsedMeta = JSON.parse(f.name);
          } catch (e) {}
          return { ...f, _meta: parsedMeta };
        });

        // Priority 1: 'single' scope matching the exact mediaId
        const singleFlows = parsedFlows.filter(f => f._meta.scope === 'single' && f._meta.postId);
        if (singleFlows.length > 0 && mediaId) {
          mediaShortcode = await getMediaShortcode(mediaId);
          if (mediaShortcode) {
            flow = singleFlows.find(f => {
              // The user inputs a full URL like https://www.instagram.com/p/CXYZ/
              // We check if the URL contains the shortcode
              return typeof f._meta.postId === 'string' && f._meta.postId.includes(mediaShortcode!);
            });
          }
        }

        // Fallback to next post or all posts
        if (!flow) {
          flow = parsedFlows.find(f => f._meta.scope === 'next') || 
                 parsedFlows.find(f => f._meta.scope === 'all') || 
                 parsedFlows[0]; // Ultimate fallback
        }
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
