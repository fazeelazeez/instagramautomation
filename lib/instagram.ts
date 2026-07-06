import { NextResponse } from 'next/server';

const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;

/**
 * Sends a Direct Message to an Instagram user.
 * @param recipientId - The Instagram-scoped ID of the user.
 * @param messageText - The text to send.
 */
export async function sendInstagramDM(recipientId: string, messageText: string) {
  const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  const payload = {
    recipient: { id: recipientId },
    message: { text: messageText }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Instagram API Error: ${JSON.stringify(data)}`);
    }
    console.log('DM sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending DM:', error);
    throw error;
  }
}

/**
 * Sends a public reply to an Instagram comment.
 * @param commentId - The ID of the comment to reply to.
 * @param messageText - The text of the reply.
 */
export async function replyToComment(commentId: string, messageText: string) {
  const url = `https://graph.facebook.com/v20.0/${commentId}/replies?access_token=${PAGE_ACCESS_TOKEN}`;

  const payload = {
    message: messageText
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Instagram API Error: ${JSON.stringify(data)}`);
    }
    console.log('Comment reply sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error replying to comment:', error);
    throw error;
  }
}
