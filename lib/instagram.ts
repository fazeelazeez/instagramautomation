import { getAccessToken } from '@/lib/token';

const INSTAGRAM_BUSINESS_ID = '17841462007877659'; // silqueendesigns

/**
 * Fetches the shortcode for a given Instagram Media ID.
 */
export async function getMediaShortcode(mediaId: string): Promise<string | null> {
  if (!mediaId) return null;
  const token = await getAccessToken();
  const url = `https://graph.instagram.com/v25.0/${mediaId}?fields=shortcode&access_token=${token}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.shortcode) return data.shortcode;
  } catch (e) {
    console.error('Failed to fetch media shortcode:', e);
  }
  return null;
}

/**
 * Checks if a specific Instagram user follows the Instagram Business account.
 */
export async function checkUserFollowsBusiness(userId: string): Promise<boolean> {
  if (!userId) return false;
  const token = await getAccessToken();
  const url = `https://graph.instagram.com/v25.0/${userId}?fields=is_user_follow_business&access_token=${token}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data && typeof data.is_user_follow_business === 'boolean') {
      return data.is_user_follow_business;
    }
  } catch (e) {
    console.error('Failed to check user follow status:', e);
  }
  return true;
}

/**
 * Sends a Direct Message to an Instagram user triggered by their comment.
 * Using comment_id as recipient bypasses the 24-hour window restriction.
 */
export async function sendInstagramDM(commentId: string, messageText: string, userId?: string) {
  const token = await getAccessToken();
  const url = `https://graph.instagram.com/v25.0/${INSTAGRAM_BUSINESS_ID}/messages`;

  let textToSend = messageText;
  let quickRepliesPayload: any[] | undefined = undefined;
  let requireFollow = false;

  if (messageText && (messageText.trim().startsWith('{') || messageText.trim().startsWith('['))) {
    try {
      const parsed = JSON.parse(messageText);
      if (parsed && typeof parsed === 'object') {
        textToSend = parsed.text || '';
        requireFollow = !!parsed.requireFollow;

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
      console.warn('Failed to parse DM message text as JSON, falling back to raw text:', e);
    }
  }

  if (requireFollow && userId) {
    const isFollowing = await checkUserFollowsBusiness(userId);
    if (!isFollowing) {
      console.log(`User ${userId} does not follow business page. Sending follow prompt.`);
      textToSend = `Hey! ✨ Thank you for your comment! To receive the details in DM, please Follow our page @silqueendesigns first! 🌸`;
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
      'Authorization': `Bearer ${token}`
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
 * Sends a Direct Message to an Instagram User by Recipient User ID.
 */
export async function sendDirectMessageToUser(recipientId: string, messageText: string) {
  const token = await getAccessToken();
  const url = `https://graph.instagram.com/v25.0/${INSTAGRAM_BUSINESS_ID}/messages`;

  let textToSend = messageText;
  if (messageText && (messageText.trim().startsWith('{') || messageText.trim().startsWith('['))) {
    try {
      const parsed = JSON.parse(messageText);
      if (parsed && typeof parsed === 'object') {
        textToSend = parsed.text || '';
      }
    } catch (e) {}
  }

  const payload = {
    recipient: { id: recipientId },
    message: { text: textToSend }
  };

  console.log('Sending DM to User ID:', recipientId, JSON.stringify(payload));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('User DM API Error:', JSON.stringify(data));
    throw new Error(`User DM Error: ${JSON.stringify(data)}`);
  }
  console.log('User DM sent successfully ✅:', data);
  return data;
}

/**
 * Sends a public reply to an Instagram comment via Instagram API.
 */
export async function replyToComment(commentId: string, messageText: string) {
  const token = await getAccessToken();
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
      'Authorization': `Bearer ${token}`
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
