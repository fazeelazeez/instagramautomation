/**
 * Google Gemini 2.5 Flash AI Intent Classifier & Reply Generator
 */

export interface AIAnalysisResult {
  intent: 'PRICE_INQUIRY' | 'COMPLIMENT' | 'OTHER';
  suggestedReply: string;
}

export async function analyzeCommentWithAI(commentText: string): Promise<AIAnalysisResult | null> {
  const trimmed = (commentText || '').trim();
  
  // Guard: Skip AI for empty, ultra-short (<2 chars), or single-emoji comments to save AI credits
  if (!trimmed || trimmed.length < 2) {
    return null;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    console.warn('GEMINI_API_KEY is not configured in environment variables.');
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;

  const promptText = `You are an AI assistant for Silqueen Designs (a high-end fashion & luxury boutique).
Analyze the following Instagram comment: "${commentText}"

Determine the user's intent:
1. "PRICE_INQUIRY": If the user is asking about price, rate, details, cost, delivery, ordering, how to buy, or availability in any language (English, Malayalam, Manglish, Tamil, Hindi).
2. "COMPLIMENT": If the user is giving praise, compliments, love emojis, or general positive feedback.
3. "OTHER": General questions or comments.

Return ONLY a JSON object:
{
  "intent": "PRICE_INQUIRY" | "COMPLIMENT" | "OTHER",
  "suggestedReply": "A short, warm, elegant 1-sentence Instagram comment reply with relevant emojis."
}`;

  const payload = {
    contents: [
      {
        parts: [{ text: promptText }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Gemini API Error:', response.status, JSON.stringify(errData));
      return null;
    }

    const data = await response.json();
    const jsonString = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (jsonString) {
      const parsed: AIAnalysisResult = JSON.parse(jsonString);
      return parsed;
    }
  } catch (err) {
    console.error('Failed to call Gemini AI API:', err);
  }

  return null;
}
