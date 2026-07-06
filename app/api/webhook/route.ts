import { NextResponse } from 'next/server';
import { sendInstagramDM, replyToComment } from '@/lib/instagram';

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'silqueen_automation_2026';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  } else {
    return new Response('Verification failed', { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object === 'instagram') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'comments') {
            const commentData = change.value;
            const commentText = commentData.text.toLowerCase();
            const commentId = commentData.id;
            const fromId = commentData.from.id;

            // Automation Logic
            if (commentText.includes('price') || commentText.includes('details') || commentText.includes('how much')) {
              // 1. Reply publicly
              await replyToComment(commentId, "Check your DM for the details! ✨");

              // 2. Send private DM
              await sendInstagramDM(fromId, "Hello! The price for this custom Silqueen design is $150. Would you like to proceed with an order?");
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
