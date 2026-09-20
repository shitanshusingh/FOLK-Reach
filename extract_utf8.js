const fs = require('fs');
const lines = fs.readFileSync('C:/Users/acer/.gemini/antigravity/brain/ab7fe197-4b45-4a2a-a117-ca68fdced4bb/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');
let out = '';
lines.forEach(l => {
  if (l.includes('"USER_INPUT"')) {
    try {
      const obj = JSON.parse(l);
      out += "----\n" + obj.content + "\n";
    } catch(e) {}
  }
});
fs.writeFileSync('C:/Users/acer/.gemini/antigravity/scratch/folkreach/user_inputs_utf8.txt', out, 'utf8');
