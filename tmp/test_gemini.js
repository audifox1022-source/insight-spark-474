const API_KEY = process.argv[2];
const MODEL = "gemini-2.5-flash";

async function testModel() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const payload = {
      contents: [{ parts: [{ text: "Hello" }] }]
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (response.ok) {
      console.log("SUCCESS: gemini-2.5-flash is valid.");
    } else {
      console.log(`FAILURE: ${data.error?.message || 'Unknown error'}`);
    }
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

testModel();
