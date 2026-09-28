const fs = require('fs');
let content = fs.readFileSync('src/components/people/InteractionModal.tsx', 'utf8');

const targetStr = `import { useState } from "react";`;
const replacementStr = `import { useState, useEffect } from "react";`;

content = content.replace(targetStr, replacementStr);

const stateTargetStr = `  const [durationMinutes, setDurationMinutes] = useState<number | "">("");`;
const stateReplacementStr = `  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [startTime] = useState(Date.now());

  // Automatically calculate elapsed time when they return to the app
  useEffect(() => {
    if (type !== 'CALL') return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const elapsedMs = Date.now() - startTime;
        const elapsedMins = Math.round(elapsedMs / 60000);
        setDurationMinutes(prev => prev === "" ? Math.max(1, elapsedMins) : prev);
      }
    };
    
    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const elapsedMins = Math.round(elapsedMs / 60000);
      setDurationMinutes(prev => prev === "" && elapsedMins > 0 ? elapsedMins : prev);
    }, 10000);

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [type, startTime]);`;

content = content.replace(stateTargetStr, stateReplacementStr);
fs.writeFileSync('src/components/people/InteractionModal.tsx', content, 'utf8');
console.log('Modified InteractionModal.tsx');
