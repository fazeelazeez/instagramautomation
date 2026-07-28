import { NextResponse } from 'next/server';
import { sendInstagramDM, sendDirectMessageToUser, replyToComment, getMediaShortcode } from '@/lib/instagram';
import { supabase } from '@/lib/supabase';
import { matchesKeywordInSentence, isAppreciationComment, DEFAULT_APPRECIATION_REPLIES } from '@/lib/matching';

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
  try {
    await processWebhook(body);
  } catch (err) {
    console.error('Webhook processing error:', err);
  }

  // Always return 200 to Meta
  return NextResponse.json({ status: 'success' });
}

async function processWebhook(body: any) {
  // Log raw incoming webhook
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

  // Fetch all active automation flows once for matching
  let activeFlows: any[] = [];
  try {
    const { data } = await supabase
      .from('automation_flows')
      .select('*')
      .eq('is_active', true);
    if (data) activeFlows = data;
  } catch (e) {
    console.error('Failed to fetch active flows:', e);
  }

  for (const entry of (body.entry || [])) {

    // -------------------------------------------------------------
    // 1. Process Instagram Comments (entry.changes)
    // -------------------------------------------------------------
    for (const change of (entry.changes || [])) {
      if (change.field !== 'comments') continue;

      const commentData = change.value;
      if (!commentData?.text || !commentData?.from?.id) {
        console.log('Comment data incomplete, skipping.');
        continue;
      }

      const rawCommentText = commentData.text.trim();
      const commentTextUpper = rawCommentText.toUpperCase();
      const commentId = commentData.id;
      const fromId = commentData.from.id;
      const fromUsername = commentData.from.username || 'unknown';

      console.log(`Processing comment: "${rawCommentText}" from @${fromUsername}`);

      // Anti-spam check
      try {
        const { data: existingLog } = await supabase
          .from('automation_logs')
          .select('id')
          .eq('instagram_post_id', commentId)
          .maybeSingle();

        if (existingLog) {
          console.log('Already processed comment:', commentId);
          continue;
        }
      } catch (spamErr) {
        console.error('Anti-spam check failed:', spamErr);
      }

      // Match flows using exact, sentence, and fuzzy matching
      const matchedFlows = activeFlows.filter(f => {
        return matchesKeywordInSentence(rawCommentText, f.trigger_keyword);
      });

      let flow: any = null;
      const mediaId = commentData.media?.id;
      let mediaShortcode: string | null = null;

      if (matchedFlows.length > 0) {
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
              return typeof f._meta.postId === 'string' && f._meta.postId.includes(mediaShortcode!);
            });
          }
        }

        // Fallback to next post or all posts
        if (!flow) {
          flow = parsedFlows.find(f => f._meta.scope === 'next') || 
                 parsedFlows.find(f => f._meta.scope === 'all') || 
                 parsedFlows[0];
        }
      }

      // Handle Appreciation Comments if no explicit flow matched
      if (!flow && isAppreciationComment(rawCommentText)) {
        console.log(`Detected appreciation comment: "${rawCommentText}". Sending randomized thank-you reply.`);
        const randomIndex = Math.floor(Math.random() * DEFAULT_APPRECIATION_REPLIES.length);
        const randomReply = DEFAULT_APPRECIATION_REPLIES[randomIndex];

        try {
          await replyToComment(commentId, randomReply);
          console.log('Appreciation comment reply sent ✅');
          
          await supabase.from('automation_logs').insert([{
            flow_id: null,
            instagram_post_id: commentId,
            sender_handle: fromUsername,
            action_taken: 'comment_only',
            status: 'processed'
          }]);
        } catch (apprErr) {
          console.error('Failed to reply to appreciation comment:', apprErr);
        }
        continue;
      }

      if (!flow) {
        console.log(`No active flow or appreciation pattern matched for comment: "${rawCommentText}"`);
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

      // Send DM (with Follow Verification)
      if (flow.response_dm) {
        try {
          await sendInstagramDM(commentId, flow.response_dm, fromId);
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
        console.error('Failed to log success:', logErr);
      }
    }

    // -------------------------------------------------------------
    // 2. Process Instagram Direct Messages & Story Replies (entry.messaging)
    // -------------------------------------------------------------
    for (const messagingItem of (entry.messaging || [])) {
      const senderId = messagingItem.sender?.id;
      const messageObj = messagingItem.message;

      if (!senderId || !messageObj) continue;

      const messageText = (messageObj.text || '').trim();
      console.log(`Processing DM/Story reply from user ID ${senderId}: "${messageText}"`);

      if (!messageText) continue;

      // Find matching flow
      const matchedFlows = activeFlows.filter(f => {
        return matchesKeywordInSentence(messageText, f.trigger_keyword);
      });

      let flow: any = matchedFlows[0];
      if (!flow) {
        console.log(`No active flow matched for DM: "${messageText}"`);
        continue;
      }

      console.log('DM Flow matched! Replying to user:', flow.name);

      if (flow.response_dm) {
        try {
          await sendDirectMessageToUser(senderId, flow.response_dm);
          console.log('Story Reply / DM sent ✅');
        } catch (dmErr) {
          console.error('Failed to send Story Reply DM:', dmErr);
        }
      }

      try {
        await supabase.from('automation_logs').insert([{
          flow_id: flow.id,
          instagram_post_id: 'DM_' + Date.now(),
          sender_handle: senderId,
          action_taken: 'dm_only',
          status: 'processed'
        }]);
      } catch (e) {}
    }
  }
}
