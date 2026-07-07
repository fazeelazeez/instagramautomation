import { NextResponse } from 'next/server';
import { sendInstagramDM, replyToComment } from '@/lib/instagram';
import { supabase } from '@/lib/supabase';

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'silqueen_automation_2026';

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
  try {
    const body = await request.json();
    console.log('Received Webhook:', JSON.stringify(body, null, 2));

    if (body.object === 'instagram') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'comments') {
            const commentData = change.value;
            const commentText = commentData.text.trim().toUpperCase(); // Normalize for matching
            const commentId = commentData.id;
            const fromId = commentData.from.id;

            console.log(`New comment: "${commentText}" from ${fromId}`);

            // 1. Fetch matching flow from Supabase
            const { data: flow, error } = await supabase
              .from('automation_flows')
              .select('*')
              .eq('trigger_keyword', commentText)
              .eq('is_active', true)
              .single();

            if (error) {
              console.log('No matching active flow found for keyword:', commentText);
              continue;
            }

            if (flow) {
              console.log('Flow detected! Triggering automation:', flow.name);

              // 2. Reply publicly using database content
              if (flow.response_comment) {
                await replyToComment(commentId, flow.response_comment);
              }

              // 3. Send private DM using database content
              if (flow.response_dm) {
                await sendInstagramDM(fromId, flow.response_dm);
              }
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
