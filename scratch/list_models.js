const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const apiKey = env.match(/GEMINI_API_KEY=(.*)/)[1].trim();

async function list() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.models) {
    console.log('Available models:');
    console.log(data.models.map(m => m.name).slice(0, 15));
  } else {
    console.log(data);
  }
}

list();
