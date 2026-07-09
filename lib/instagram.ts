const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ID = '17841462007877659'; // silqueendesigns

/**
 * Sends a Direct Message to an Instagram user triggered by their comment.
 * Using comment_id as recipient bypasses the 24-hour window restriction.
 * @param commentId - The ID of the comment that triggered this DM.
 * @param messageText - The text to send.
 */
export async function sendInstagramDM(commentId: string, messageText: string) {
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
