import { NextResponse } from 'next/server';
import { sendInstagramDM, sendDirectMessageToUser, replyToComment, getMediaShortcode, getInstagramUsername, sendFacebookMessengerDM, replyToFacebookComment } from '@/lib/instagram';
import { supabase } from '@/lib/supabase';
import { matchesKeywordInSentence, isAppreciationComment, DEFAULT_APPRECIATION_REPLIES } from '@/lib/matching';
import { analyzeCommentWithAI } from '@/lib/ai';

// Version 2.3 - Production Ready Instagram Webhook with Per-User Per-Post DM Limit (1 DM Max)
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

  if (body.object !== 'instagram' && body.object !== 'page') {
    console.log('Not an Instagram or Page event, skipping.');
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
    // 1. Process Comments (Instagram entry.changes comments & Facebook Page entry.changes feed)
    // -------------------------------------------------------------
    for (const change of (entry.changes || [])) {
      const isIgComment = change.field === 'comments';
      const isFbComment = change.field === 'feed' && (!!change.value?.comment_id || change.value?.item === 'comment');
      if (!isIgComment && !isFbComment) continue;

      const commentData = change.value;
      const rawCommentText = (isIgComment ? commentData?.text : commentData?.message || '').trim();
      const commentId = isIgComment ? commentData?.id : commentData?.comment_id || `FB_${Date.now()}`;
      const fromId = isIgComment ? commentData?.from?.id : commentData?.sender_id;
      const fromUsername = isIgComment ? (commentData?.from?.username || '').toLowerCase() : (commentData?.sender_name || fromId || '').toLowerCase();
      const mediaId = isIgComment ? (commentData?.media?.id || 'MEDIA_GLOBAL') : (commentData?.post_id ? commentData.post_id.split('_').pop() : 'MEDIA_GLOBAL');

      if (!rawCommentText || !fromId) {
        console.log('Comment data incomplete, skipping.');
        continue;
      }

      // CRITICAL GUARD: Skip processing comments/replies created by the Business Page itself!
      if (fromId === INSTAGRAM_BUSINESS_ID || fromUsername === 'silqueendesigns' || (fromUsername.includes('silqueen') && fromUsername !== 'audooly')) {
        console.log(`Skipping self-comment webhook from business page (@${fromUsername} / ID: ${fromId})`);
        continue;
      }

      console.log(`Processing comment [ID: ${commentId}]: "${rawCommentText}" from @${fromUsername} on Media ID: ${mediaId}`);

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
      let mediaShortcode: string | null = null;

      if (matchedFlows.length > 0) {
        const parsedFlows = matchedFlows.map(f => {
          let parsedMeta: any = { scope: 'all', postId: null };
          try {
            if (f.name.startsWith('{')) parsedMeta = JSON.parse(f.name);
          } catch (e) {}
          return { ...f, _meta: parsedMeta };
        });

        // Priority 1: 'single' scope matching the exact mediaId or facebookUrl
        const singleFlows = parsedFlows.filter(f => f._meta.scope === 'single' && (f._meta.postId || f._meta.facebookUrl));
        if (singleFlows.length > 0 && mediaId) {
          mediaShortcode = await getMediaShortcode(mediaId);
          flow = singleFlows.find(f => {
            const igMatch = typeof f._meta.postId === 'string' && (f._meta.postId.includes(mediaId) || (mediaShortcode && f._meta.postId.includes(mediaShortcode)));
            const fbUrl = typeof f._meta.facebookUrl === 'string' ? f._meta.facebookUrl : '';
            const fbNumId = fbUrl.replace(/[^0-9]/g, '');
            const fbMatch = fbUrl && (
              fbUrl.includes(mediaId) ||
              (commentData?.post_id && fbUrl.includes(commentData.post_id)) ||
              (fbNumId && commentData?.post_id && commentData.post_id.includes(fbNumId)) ||
              (fbNumId && commentId && commentId.includes(fbNumId))
            );
            return igMatch || fbMatch;
          });
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
          if (isFbComment) {
            await replyToFacebookComment(commentId, flow.response_comment);
          } else {
            await replyToComment(commentId, flow.response_comment);
          }
          console.log('Comment reply sent ✅');
        } catch (err) {
          console.error('Failed to reply to comment:', err);
        }
      }

      // Send DM (with Follow Verification & Per-User Per-Post Rate Limit)
      if (flow.response_dm) {
        const userHandle = fromUsername || fromId;
        let alreadySentDM = false;

        try {
          const { data: userPostLogs } = await supabase
            .from('automation_logs')
            .select('id')
            .eq('sender_handle', userHandle)
            .eq('instagram_post_id', `DM_${mediaId}`)
            .limit(1);

          if (userPostLogs && userPostLogs.length > 0) {
            alreadySentDM = true;
          }
        } catch (e) {}

        if (alreadySentDM) {
          console.log(`Per-user DM limit: User @${userHandle} already received DM for post ${mediaId}. Skipping 2nd DM.`);
        } else {
          try {
            if (isFbComment) {
              await sendFacebookMessengerDM(fromId, flow.response_dm);
            } else {
              await sendInstagramDM(commentId, flow.response_dm, fromId);
            }
            console.log('DM sent ✅');

            // Log DM delivered for this specific user + post combination
            await supabase.from('automation_logs').insert([{
              flow_id: flow.id,
              instagram_post_id: `DM_${mediaId}`,
              sender_handle: userHandle,
              action_taken: 'dm_sent_to_user',
              status: 'processed'
            }]);
          } catch (err) {
            console.error('Failed to send DM:', err);
          }
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

      // Detect if user shared a Reel or Post to DM (via attachments, share payload, or Instagram URL)
      const hasAttachment = Boolean(messageObj.attachments?.length || messageObj.share);
      const isReelLink = messageText.includes('instagram.com/reel') || messageText.includes('instagram.com/p/');
      const isShareEvent = hasAttachment || isReelLink;

      let sharedUrl = messageObj.share?.link || messageObj.attachments?.[0]?.payload?.url || '';
      if (!sharedUrl && isReelLink) {
        const match = messageText.match(/https?:\/\/(www\.)?instagram\.com\/(reel|p)\/[A-Za-z0-9_-]+/i);
        if (match) sharedUrl = match[0];
      }

      // Find matching flow
      const matchedFlows = activeFlows.filter(f => {
        return matchesKeywordInSentence(messageText, f.trigger_keyword);
      });

      // Handle Direct Reel Share Event (Step 1: Ask user to follow & comment FIRST)
      if (isShareEvent) {
        console.log(`Reel/Post Share detected in DM from @${senderHandle}. Shared URL: ${sharedUrl}`);

        // Try matching exact single-post flow for this shared reel shortcode
        const shortcodeMatch = sharedUrl.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/i);
        const shortcode = shortcodeMatch ? shortcodeMatch[1] : '';

        const matchedReelFlow = activeFlows.find((f: any) => {
          try {
            const parsed = JSON.parse(f.name);
            const igMatch = shortcode && (parsed.postId?.includes(shortcode) || parsed.postUrl?.includes(shortcode));
            const fbMatch = shortcode && parsed.facebookUrl?.includes(shortcode);
            if (igMatch || fbMatch) {
              return true;
            }
          } catch (e) {}
          return false;
        });

        // 1-Hour Deduplication Guard: Check if prompt/DM was already sent for this share within last 1 hour
        try {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { data: recentDMs } = await supabase
            .from('automation_logs')
            .select('id')
            .or(`sender_handle.eq.${senderId},sender_handle.eq.${senderHandle}`)
            .eq('action_taken', 'DIRECT_SHARE_PENDING_20M')
            .gte('created_at', oneHourAgo)
            .limit(1);

          if (recentDMs && recentDMs.length > 0) {
            console.log(`User @${senderHandle} (${senderId}) already received a share prompt within last 1 hour. Skipping duplicate DM prompt.`);
            continue;
          }
        } catch (e) {}

        const promptMessage = `Thanks for reaching out! ✨ Please follow our page @silqueendesigns and comment "DETAILS" or "PRICE" on that reel to get instant pricing details!`;

        try {
          await sendDirectMessageToUser(senderId, promptMessage);
          console.log(`Step 1 Prompt DM sent to @${senderHandle} for shared reel ✅`);

          await supabase.from('automation_logs').insert([{
            flow_id: matchedReelFlow?.id || null,
            instagram_post_id: sharedUrl || ('SHARED_' + Date.now()),
            sender_handle: senderId, // Must be numeric IGSID for Meta Send API
            action_taken: 'DIRECT_SHARE_PENDING_20M',
            status: 'processed'
          }]);
          console.log(`Logged DIRECT_SHARE_PENDING_20M for senderId: ${senderId} (@${senderHandle}) with flow_id: ${matchedReelFlow?.id || 'null'} ✅`);
        } catch (promptErr) {
          console.error('Failed to send Step 1 prompt DM:', promptErr);
        }
        continue;
      }

      // Boutique DM Rule: For general DMs, text messages, reference images, or general questions,
      // DO NOT send automated DM replies! Leave the chat clean for manual boutique owner conversation.
      console.log(`Boutique rule applied: General DM / reference image from @${senderHandle} ("${messageText}"). Skipping automated DM to allow manual response.`);
      continue;
    }
  }
}
