import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    } else {
      return new Response(null, { status: 403 });
    }
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  console.log('Incoming Webhook:', JSON.stringify(body, null, 2));

  const entry = body.entry?.[0];
  console.log('Entry structure:', JSON.stringify(entry, null, 2));
  const changes = entry?.changes?.[0];
  const messaging = entry?.messaging?.[0];

  // 1. Handle Comments & Mentions
  if (changes?.field === 'comments' || changes?.field === 'mentions') {
    console.log('Change detected:', JSON.stringify(changes, null, 2));
    const comment = changes.value;
    const commentText = (comment.text || comment.message || '').toLowerCase();
    const commentId = comment.id;
    const fromId = comment.from?.id;

    if (commentText) {
      const { data: flows } = await supabase.from('automation_flows').select('*').eq('is_active', true);
      if (flows) {
        for (const flow of flows) {
          if (commentText.includes(flow.trigger_keyword.toLowerCase())) {
            const { data: account } = await supabase.from('instagram_accounts').select('access_token').single();
            if (account && fromId) {
              await sendPublicReply(commentId, flow.response_comment, account.access_token);
              await sendPrivateDM(fromId, flow.response_dm, account.access_token);
              console.log('Automation triggered for comment!');
            }
          }
        }
      }
    }
  }

  // 2. Handle Direct Messages (DMs) & Edits
  const msgData = messaging?.message || messaging?.message_edit;
  if (msgData) {
    console.log('Message data detected:', JSON.stringify(msgData, null, 2));
    const messageText = (msgData.text || '').toLowerCase();
    const senderId = messaging.sender?.id;

    if (messageText) {
      const { data: flows } = await supabase.from('automation_flows').select('*').eq('is_active', true);
      if (flows) {
        for (const flow of flows) {
          if (messageText.includes(flow.trigger_keyword.toLowerCase())) {
            const { data: account } = await supabase.from('instagram_accounts').select('access_token').single();
            if (account && senderId) {
              await sendPrivateDM(senderId, flow.response_dm, account.access_token);
              console.log('Automation triggered for DM!');
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ status: 'success' });
}

async function sendPublicReply(commentId: string, message: string, token: string) {
  const url = `https://graph.facebook.com/v19.0/${commentId}/replies`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: token }),
  });
  const result = await response.json();
  console.log('Public Reply Response:', JSON.stringify(result, null, 2));
}

async function sendPrivateDM(recipientId: string, message: string, token: string) {
  const url = `https://graph.facebook.com/v19.0/me/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
      access_token: token,
    }),
  });
  const result = await response.json();
  console.log('Private DM Response:', JSON.stringify(result, null, 2));
}
