const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

content = content.replace(
  `const isRescheduled = outcome === 'Reschedule';\n      const isDone = !!interaction && !isRescheduled;`,
  `const isRescheduled = outcome === 'Reschedule';\n      const isDone = !!interaction;`
);

fs.writeFileSync('src/app/page.tsx', content, 'utf8');
console.log('Modified page.tsx');
