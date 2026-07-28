const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const apiKey = env.match(/GEMINI_API_KEY=(.*)/)[1].trim();

async function testComment(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are an AI assistant for Silqueen Designs (a luxury boutique).
Analyze the following Instagram comment: "${text}"

Respond with JSON:
{
  "intent": "PRICE_INQUIRY" | "COMPLIMENT" | "OTHER",
  "suggestedReply": "A short, warm 1-sentence Instagram comment reply with emojis"
}`
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log(`Comment: "${text}" =>`);
  console.log(data.candidates[0].content.parts[0].text);
}

async function runAll() {
  await testComment("ethra aakum delivery ullathano?");
  await testComment("adipoli design super work!");
}

runAll();
