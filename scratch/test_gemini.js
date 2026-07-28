const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const apiKey = env.match(/GEMINI_API_KEY=(.*)/)[1].trim();

async function testGemini() {
  console.log('Testing Gemini API key:', apiKey.substring(0, 10) + '...');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are an AI assistant for Silqueen Designs, a high-end fashion boutique.
Analyze the following Instagram comment: "bro how much for this dress in medium size?"
Determine the intent of the comment. Return ONLY a JSON object:
{
  "intent": "PRICE_INQUIRY" | "COMPLIMENT" | "OTHER",
  "suggestedReply": "A short friendly 1-sentence Instagram comment reply with emojis"
}`
          }
        ]
      }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Gemini Response:');
  console.log(JSON.stringify(data, null, 2));
}

testGemini();
