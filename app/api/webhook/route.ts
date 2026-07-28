import { NextResponse } from 'next/server';
import { sendInstagramDM, sendDirectMessageToUser, replyToComment, getMediaShortcode } from '@/lib/instagram';
import { supabase } from '@/lib/supabase';
import { matchesKeywordInSentence, isAppreciationComment, DEFAULT_APPRECIATION_REPLIES } from '@/lib/matching';

// Version 1.5 - Production Ready Instagram Webhook
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'silqueen_automation_2026';

// In-memory set for ultra-fast webhook deduplication across concurrent executions
const processedCommentIds = new Set<string>();

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

  try {
    await processWebhook(body);
  } catch (err) {
    console.error('Webhook processing error:', err);
  }

  return NextResponse.json({ status: 'success' });
}

async function processWebhook(body: any) {
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
      const commentId = commentData.id;
      const fromId = commentData.from.id;
      const fromUsername = commentData.from.username || 'unknown';

      console.log(`Processing comment [ID: ${commentId}]: "${rawCommentText}" from @${fromUsername}`);

      // 1. In-memory Deduplication Check
      if (processedCommentIds.has(commentId)) {
        console.log('In-memory lock triggered: Comment already processing/processed:', commentId);
        continue;
      }
      processedCommentIds.add(commentId);

      // Clean up in-memory set size periodically (keep max 1000 items)
      if (processedCommentIds.size > 1000) {
        const firstKey = processedCommentIds.values().next().value;
        if (firstKey) processedCommentIds.delete(firstKey);
      }

      // 2. Database Anti-Spam / Deduplication Check
      try {
        const { data: existingLog } = await supabase
          .from('automation_logs')
          .select('id')
          .eq('instagram_post_id', commentId)
          .maybeSingle();

        if (existingLog) {
          console.log('Database lock triggered: Comment already in automation_logs:', commentId);
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

        // Reserve DB log BEFORE sending reply to prevent concurrent execution
        try {
          await supabase.from('automation_logs').insert([{
            flow_id: null,
            instagram_post_id: commentId,
            sender_handle: fromUsername,
            action_taken: 'comment_only',
            status: 'processed'
          }]);
        } catch (e) {}

        try {
          await replyToComment(commentId, randomReply);
          console.log('Appreciation comment reply sent ✅');
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

      // Reserve DB log BEFORE executing replies to prevent duplicate concurrent webhook retries
      try {
        await supabase.from('automation_logs').insert([{
          flow_id: flow.id,
          instagram_post_id: commentId,
          sender_handle: fromUsername,
          action_taken: 'both',
          status: 'processed'
        }]);
      } catch (e) {}

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
    }

    // -------------------------------------------------------------
    // 2. Process Instagram Direct Messages & Story Replies (entry.messaging)
    // -------------------------------------------------------------
    for (const messagingItem of (entry.messaging || [])) {
      const senderId = messagingItem.sender?.id;
      const messageObj = messagingItem.message;

      if (!senderId || !messageObj) continue;

      const messageText = (messageObj.text || '').trim();
      const messageId = messageObj.mid || ('DM_' + Date.now());
      console.log(`Processing DM/Story reply [ID: ${messageId}] from user ID ${senderId}: "${messageText}"`);

      if (!messageText) continue;

      if (processedCommentIds.has(messageId)) {
        console.log('In-memory lock triggered: DM already processed:', messageId);
        continue;
      }
      processedCommentIds.add(messageId);

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

      try {
        await supabase.from('automation_logs').insert([{
          flow_id: flow.id,
          instagram_post_id: messageId,
          sender_handle: senderId,
          action_taken: 'dm_only',
          status: 'processed'
        }]);
      } catch (e) {}

      if (flow.response_dm) {
        try {
          await sendDirectMessageToUser(senderId, flow.response_dm);
          console.log('Story Reply / DM sent ✅');
        } catch (dmErr) {
          console.error('Failed to send Story Reply DM:', dmErr);
        }
      }
    }
  }
}
