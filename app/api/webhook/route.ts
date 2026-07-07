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

    // DEBUG: Log EVERY incoming webhook to database so we can see what Meta is sending
    await supabase.from('automation_logs').insert([
      {
        action_taken: 'RAW_WEBHOOK_DEBUG',
        status: 'received',
        sender_handle: 'META_DEBUG',
        instagram_post_id: 'RAW_' + Date.now(),
        metadata: body // Assuming we have a JSONB column or similar
      }
    ]).catch(err => console.error('Failed to log raw webhook:', err));

    if (body.object === 'instagram') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'comments') {
            const commentData = change.value;
            const commentText = commentData.text.trim().toUpperCase();
            const commentId = commentData.id;
            const fromId = commentData.from.id;

            // 1. Check if we have already processed this comment ID (Anti-Spam)
            const { data: existingLog } = await supabase
              .from('automation_logs')
              .select('id')
              .eq('instagram_post_id', commentId) // Using this field for Comment ID
              .single();

            if (existingLog) {
              console.log('Comment already processed, skipping:', commentId);
              continue;
            }

            // 2. Fetch matching flow
            const { data: flow } = await supabase
              .from('automation_flows')
              .select('*')
              .eq('trigger_keyword', commentText)
              .eq('is_active', true)
              .single();

            if (flow) {
              console.log('Flow detected! Triggering automation:', flow.name);

              // 3. Execute actions with individual try-catches
              try {
                if (flow.response_comment) {
                  await replyToComment(commentId, flow.response_comment);
                }
              } catch (err) {
                console.error('Failed to reply to comment:', err);
              }

              try {
                if (flow.response_dm) {
                  await sendInstagramDM(fromId, flow.response_dm);
                }
              } catch (err) {
                console.error('Failed to send DM (Check permissions/Tester roles):', err);
              }

              // 4. Log the success to database to prevent repeats
              await supabase.from('automation_logs').insert([
                {
                  flow_id: flow.id,
                  instagram_post_id: commentId,
                  sender_handle: commentData.from.username,
                  action_taken: 'both',
                  status: 'processed'
                }
              ]);
            }
          }
        }
      }
    }

    // ALWAYS return 200 OK to Meta to stop retries
    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('Webhook Critical Error:', error);
    return NextResponse.json({ status: 'success' }); // Still return success to avoid loops
  }
}
