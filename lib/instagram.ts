import { supabase } from './supabase';

const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ID = '17841462007877659'; // silqueendesigns

// Helper to extract shortcode from Instagram URL
function getShortcodeFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/(?:p|reel|tv|share\/r)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

// Fetch latest media ID for the business account
async function getLatestMediaId(): Promise<string | null> {
  try {
    const url = `https://graph.instagram.com/v25.0/${INSTAGRAM_BUSINESS_ID}/media?limit=1&access_token=${PAGE_ACCESS_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0]?.id || null;
  } catch (e) {
    console.error('Error fetching latest media ID:', e);
    return null;
  }
}

// Check if flow target matches comment media
async function flowMatchesMedia(flow: any, media: any): Promise<boolean> {
  try {
    const parsed = JSON.parse(flow.name);
    if (!parsed || typeof parsed !== 'object') {
      // Legacy flow without JSON metadata defaults to 'all' posts
      return true;
    }
    
    const scope = parsed.scope || 'all';
    if (scope === 'all') {
      return true;
    }
    
    if (scope === 'single') {
      const flowShortcode = getShortcodeFromUrl(parsed.postId);
      const commentShortcode = media.shortcode || getShortcodeFromUrl(media.permalink);
      return !!flowShortcode && !!commentShortcode && flowShortcode === commentShortcode;
    }
    
    if (scope === 'next') {
      const latestId = await getLatestMediaId();
      return !!latestId && latestId === media.id;
    }
  } catch (e) {
    // If JSON parsing fails, treat as legacy flow
    return true;
  }
  return false;
}

/**
 * Sends a Direct Message to an Instagram user triggered by their comment.
 * Using comment_id as recipient bypasses the 24-hour window restriction.
 * @param commentId - The ID of the comment that triggered this DM.
 * @param messageText - The text to send.
 */
export async function sendInstagramDM(commentId: string, messageText: string) {
  // Fetch comment details to validate post targeting scope
  let commentInfo: any = null;
  try {
    const commentUrl = `https://graph.instagram.com/v25.0/${commentId}?fields=media{id,shortcode,permalink},text&access_token=${PAGE_ACCESS_TOKEN}`;
    const response = await fetch(commentUrl);
    if (response.ok) {
      commentInfo = await response.json();
    }
  } catch (e) {
    console.error('Error fetching comment info for DM scope verification:', e);
  }

  if (commentInfo && commentInfo.media) {
    const commentText = commentInfo.text?.trim().toUpperCase() || '';
    const media = commentInfo.media;
    
    // Fetch active flows for this keyword/trigger
    const { data: activeFlows } = await supabase
      .from('automation_flows')
      .select('*')
      .eq('is_active', true)
      .or(`trigger_keyword.eq.${commentText},trigger_keyword.eq.*`);

    if (activeFlows && activeFlows.length > 0) {
      let matchedFlow: any = null;
      for (const flow of activeFlows) {
        if (await flowMatchesMedia(flow, media)) {
          matchedFlow = flow;
          break;
        }
      }
      
      if (!matchedFlow) {
        console.log(`[sendInstagramDM] Skipping DM: comment on media ${media.shortcode || media.id} does not match targeted flows for keyword "${commentText}"`);
        return { success: false, skipped: true };
      }
      
      if (matchedFlow.response_dm) {
        messageText = matchedFlow.response_dm;
      }
    }
  }

  const url = `https://graph.instagram.com/v25.0/${INSTAGRAM_BUSINESS_ID}/messages`;

  let textToSend = messageText;
  let quickRepliesPayload: any[] | undefined = undefined;

  // Safe parse JSON if it looks like JSON
  if (messageText && (messageText.trim().startsWith('{') || messageText.trim().startsWith('['))) {
    try {
      const parsed = JSON.parse(messageText);
      if (parsed && typeof parsed === 'object') {
        textToSend = parsed.text || '';
        
        // Greeting Format quick replies
        if (parsed.greetingFormat === 'quick_reply' && parsed.quickReplyLabel) {
          quickRepliesPayload = [
            {
              content_type: 'text',
              title: parsed.quickReplyLabel.substring(0, 20),
              payload: 'QUICK_REPLY_CLICKED'
            }
          ];
        }
      }
    } catch (e) {
      console.warn("Failed to parse DM message text as JSON, falling back to raw text:", e);
    }
  }

  const payload: any = {
    recipient: { comment_id: commentId }
  };

  if (quickRepliesPayload) {
    payload.message = {
      text: textToSend,
      quick_replies: quickRepliesPayload
    };
  } else {
    payload.message = {
      text: textToSend
    };
  }

  console.log('Sending DM via comment_id:', commentId, JSON.stringify(payload));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAGE_ACCESS_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('DM API Error:', JSON.stringify(data));
    throw new Error(`DM Error: ${JSON.stringify(data)}`);
  }
  console.log('DM sent successfully ✅:', data);
  return data;
}

/**
 * Sends a public reply to an Instagram comment via Instagram API.
 * Supports random template selection using "|||" delimiter.
 * @param commentId - The ID of the comment to reply to.
 * @param messageText - The text of the reply.
 */
export async function replyToComment(commentId: string, messageText: string) {
  // Fetch comment details to validate post targeting scope
  let commentInfo: any = null;
  try {
    const commentUrl = `https://graph.instagram.com/v25.0/${commentId}?fields=media{id,shortcode,permalink},text&access_token=${PAGE_ACCESS_TOKEN}`;
    const response = await fetch(commentUrl);
    if (response.ok) {
      commentInfo = await response.json();
    }
  } catch (e) {
    console.error('Error fetching comment info for reply scope verification:', e);
  }

  if (commentInfo && commentInfo.media) {
    const commentText = commentInfo.text?.trim().toUpperCase() || '';
    const media = commentInfo.media;
    
    // Fetch active flows for this keyword/trigger
    const { data: activeFlows } = await supabase
      .from('automation_flows')
      .select('*')
      .eq('is_active', true)
      .or(`trigger_keyword.eq.${commentText},trigger_keyword.eq.*`);

    if (activeFlows && activeFlows.length > 0) {
      let matchedFlow: any = null;
      for (const flow of activeFlows) {
        if (await flowMatchesMedia(flow, media)) {
          matchedFlow = flow;
          break;
        }
      }
      
      if (!matchedFlow) {
        console.log(`[replyToComment] Skipping reply: comment on media ${media.shortcode || media.id} does not match targeted flows for keyword "${commentText}"`);
        return { success: false, skipped: true };
      }
      
      if (matchedFlow.response_comment) {
        messageText = matchedFlow.response_comment;
      }
    }
  }

  let replyText = messageText;
  
  if (messageText && messageText.includes('|||')) {
    const templates = messageText.split('|||').map(t => t.trim()).filter(Boolean);
    if (templates.length > 0) {
      replyText = templates[Math.floor(Math.random() * templates.length)];
    }
  }

  const url = `https://graph.instagram.com/v25.0/${commentId}/replies`;

  const payload = {
    message: replyText
  };

  console.log('Replying to comment:', commentId, `Text: "${replyText}"`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAGE_ACCESS_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Comment Reply API Error:', JSON.stringify(data));
    throw new Error(`Comment Reply Error: ${JSON.stringify(data)}`);
  }
  console.log('Comment reply sent successfully ✅:', data);
  return data;
}
