const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

const targetStr = `    // Third: Intelligent Auto-Pipeline Fill`;
const replacementStr = `    // Second: Add anyone who was interacted with today (so they stay in the completed list!)
    for (const [personId, interaction] of doneToday.entries()) {
      if (inActionPlan.has(personId)) continue;
      const person = allPeople.find(p => p.id === personId);
      if (person) {
        const type = (interaction.type === 'MEETING' || interaction.type === 'PRASADAM' || interaction.type === 'BOOK') ? 'MEETING' : 'CALL';
        addToActionPlan(person, 'Completed Today', false, type);
      }
    }

    // Third: Intelligent Auto-Pipeline Fill`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/app/page.tsx', content, 'utf8');
console.log('Done!');
