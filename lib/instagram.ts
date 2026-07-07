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

  const payload = {
    recipient: { comment_id: commentId },  // Use comment_id not user id!
    message: { text: messageText }
  };

  console.log('Sending DM via comment_id:', commentId);

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
 * @param commentId - The ID of the comment to reply to.
 * @param messageText - The text of the reply.
 */
export async function replyToComment(commentId: string, messageText: string) {
  const url = `https://graph.instagram.com/v25.0/${commentId}/replies`;

  const payload = {
    message: messageText
  };

  console.log('Replying to comment:', commentId);

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
