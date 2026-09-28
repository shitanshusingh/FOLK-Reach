const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

const targetStr = `    // Sort each tier by urgency descending
    const sortByUrgency = (a: Candidate, b: Candidate) => b.urgency - a.urgency;
    hotCandidates.sort(sortByUrgency);
    warmCandidates.sort(sortByUrgency);
    coldCandidates.sort(sortByUrgency);
    dormantCandidates.sort(sortByUrgency);

    const mixedCandidates: Candidate[] = [];
    const queues = [hotCandidates, warmCandidates, coldCandidates, dormantCandidates];
    
    // Round-robin pull from each tier to ensure a healthy mixture of all contact types
    let activeQueues = queues.length;
    while(activeQueues > 0) {
      activeQueues = 0;
      for (const queue of queues) {
        if (queue.length > 0) {
          mixedCandidates.push(queue.shift()!);
          activeQueues++;
        }
      }
    }`;

const replacementStr = `    // Pure urgency sort across all tiers so that completed items smoothly slide up 
    // and new items strictly append to the bottom of the list.
    const mixedCandidates = [...hotCandidates, ...warmCandidates, ...coldCandidates, ...dormantCandidates];
    mixedCandidates.sort((a, b) => b.urgency - a.urgency);`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/app/page.tsx', content, 'utf8');
console.log('Replaced round-robin with strict urgency sort!');
