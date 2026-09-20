const fs = require('fs');
const lines = fs.readFileSync('C:/Users/acer/.gemini/antigravity/brain/ab7fe197-4b45-4a2a-a117-ca68fdced4bb/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');
lines.forEach(l => {
  if (l.includes('"USER_INPUT"')) {
    try {
      const obj = JSON.parse(l);
      console.log("----");
      console.log(obj.content);
    } catch(e) {}
  }
});
