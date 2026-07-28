import { NextResponse } from 'next/server';
import { sendInstagramDM, sendDirectMessageToUser, replyToComment, getMediaShortcode, getInstagramUsername } from '@/lib/instagram';
import { supabase } from '@/lib/supabase';
import { matchesKeywordInSentence, isAppreciationComment, DEFAULT_APPRECIATION_REPLIES } from '@/lib/matching';
import { analyzeCommentWithAI } from '@/lib/ai';

// Version 2.2 - Production Ready Instagram Webhook with Self-Reply Loop Guard
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'silqueen_automation_2026';
const INSTAGRAM_BUSINESS_ID = '17841462007877659';

// Global In-memory set for ultra-fast webhook deduplication across concurrent executions
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
  } catch (logErr) {}

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
      const fromUsername = (commentData.from.username || '').toLowerCase();

      // CRITICAL GUARD: Skip processing comments/replies created by the Business Page itself!
      if (fromId === INSTAGRAM_BUSINESS_ID || fromUsername === 'silqueendesigns') {
        console.log(`Skipping self-comment webhook from business page (@${fromUsername} / ID: ${fromId})`);
        continue;
      }

      console.log(`Processing comment [ID: ${commentId}]: "${rawCommentText}" from @${commentData.from.username}`);

      // STEP A: Instant In-memory Deduplication Check
      if (processedCommentIds.has(commentId)) {
        console.log('In-memory lock triggered: Comment already processing/processed:', commentId);
        continue;
      }
      processedCommentIds.add(commentId);

      if (processedCommentIds.size > 2000) {
        const firstKey = processedCommentIds.values().next().value;
        if (firstKey) processedCommentIds.delete(firstKey);
      }

      // STEP B: Bulletproof Database Deduplication Check (.limit(1))
      try {
        const { data: existingLogs } = await supabase
          .from('automation_logs')
          .select('id')
          .eq('instagram_post_id', commentId)
          .limit(1);

        if (existingLogs && existingLogs.length > 0) {
          console.log('Database lock triggered: Comment already in automation_logs:', commentId);
          continue;
        }
      } catch (spamErr) {
        console.error('Anti-spam check failed:', spamErr);
      }

      // STEP 1: Match active flows using exact, sentence, and fuzzy matching
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

      // Reserve DB log IMMEDIATELY before executing any reply or AI call
      try {
        await supabase.from('automation_logs').insert([{
          flow_id: flow?.id || null,
          instagram_post_id: commentId,
          sender_handle: commentData.from.username || fromUsername,
          action_taken: flow ? 'both' : 'comment_only',
          status: 'processed'
        }]);
      } catch (e) {}

      // STEP 2: Intelligent Fallback via Google Gemini 2.5 Flash AI Engine
      if (!flow) {
        console.log(`No explicit keyword flow matched for "${rawCommentText}". Analyzing via Gemini 2.5 Flash AI...`);
        const aiResult = await analyzeCommentWithAI(rawCommentText);

        if (aiResult) {
          console.log('Gemini AI Analysis Result:', JSON.stringify(aiResult));

          if (aiResult.intent === 'PRICE_INQUIRY') {
            const priceFlow = activeFlows.find(f => 
              f.trigger_keyword === 'PRICE' || 
              f.trigger_keyword === 'DETAILS' || 
              f.trigger_keyword === 'RATE'
            ) || activeFlows[0];

            if (priceFlow) {
              flow = priceFlow;
              console.log('Gemini AI identified PRICE_INQUIRY ➔ Executing flow:', flow.name);
            }
          } else {
            // Compliment or General Comment ➔ Reply with AI generated comment
            try {
              await replyToComment(commentId, aiResult.suggestedReply);
              console.log('Gemini AI comment reply sent ✅:', aiResult.suggestedReply);
            } catch (aiErr) {
              console.error('Failed to reply with Gemini AI comment:', aiErr);
            }
            continue;
          }
        }
      }

      // STEP 3: Fallback to local appreciation patterns if Gemini AI is unavailable
      if (!flow && isAppreciationComment(rawCommentText)) {
        console.log(`Detected appreciation comment via local rules: "${rawCommentText}". Sending thank-you reply.`);
        const randomIndex = Math.floor(Math.random() * DEFAULT_APPRECIATION_REPLIES.length);
        const randomReply = DEFAULT_APPRECIATION_REPLIES[randomIndex];

        try {
          await replyToComment(commentId, randomReply);
          console.log('Local appreciation comment reply sent ✅');
        } catch (apprErr) {
          console.error('Failed to reply to appreciation comment:', apprErr);
        }
        continue;
      }

      if (!flow) {
        console.log(`No active flow, AI analysis, or appreciation pattern matched for comment: "${rawCommentText}"`);
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
    }

    // -------------------------------------------------------------
    // 2. Process Instagram Direct Messages & Story Replies (entry.messaging)
    // -------------------------------------------------------------
    for (const messagingItem of (entry.messaging || [])) {
      const senderId = messagingItem.sender?.id;
      const messageObj = messagingItem.message;

      if (!senderId || !messageObj) continue;

      // Skip processing DMs sent BY the Business Page itself!
      if (senderId === INSTAGRAM_BUSINESS_ID) {
        console.log('Skipping DM sent by business page itself.');
        continue;
      }

      const senderHandle = await getInstagramUsername(senderId);

      const messageText = (messageObj.text || '').trim();
      const messageId = messageObj.mid || ('DM_' + Date.now());
      console.log(`Processing DM/Story reply [ID: ${messageId}] from @${senderHandle} (ID: ${senderId}): "${messageText}"`);

      // Log customer reply event so 24h follow-up is automatically canceled!
      try {
        await supabase.from('automation_logs').insert([{
          flow_id: null,
          instagram_post_id: 'USER_REPLIED_' + Date.now(),
          sender_handle: senderHandle,
          action_taken: 'customer_replied',
          status: 'processed'
        }]);
        console.log(`Log created: customer_replied for @${senderHandle} (cancels 24h follow-up) ✅`);
      } catch (e) {}

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
          sender_handle: senderHandle,
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
