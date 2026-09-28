const fs = require('fs');

function stopTimerFix(file) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add states
  if (!content.includes('isTimerRunning')) {
    content = content.replace(
      /const \[elapsedSeconds, setElapsedSeconds\] = useState\(0\);/,
      `const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [hasHidden, setHasHidden] = useState(false);`
    );
  }

  // 2. Fix the updateTimer check
  content = content.replace(
    /const updateTimer = \(\) => \{\s*const elapsedMs = Date\.now\(\) - startTime;/,
    `const updateTimer = () => {
      if (!isTimerRunning) return;
      const elapsedMs = Date.now() - startTime;`
  );

  // 3. Fix the visibility logic
  content = content.replace(
    /const handleVisibility = \(\) => \{\s*if \(document\.visibilityState === 'visible'\) \{\s*updateTimer\(\);\s*\}\s*\};/g,
    `const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setHasHidden(true);
      } else if (document.visibilityState === 'visible') {
        updateTimer();
        if (hasHidden) {
          setIsTimerRunning(false);
        }
      }
    };`
  );
  
  // 4. Update the useEffect dependency array
  content = content.replace(
    /\[isCalling, startTime, isManuallyEdited\]/g,
    `[isCalling, startTime, isManuallyEdited, isTimerRunning, hasHidden]`
  );
  content = content.replace(
    /\[type, startTime, isManuallyEdited\]/g,
    `[type, startTime, isManuallyEdited, isTimerRunning, hasHidden]`
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed timer stop logic in ' + file);
}

stopTimerFix('src/components/people/QuickDialerModal.tsx');
stopTimerFix('src/components/dashboard/LogInteractionModal.tsx');
stopTimerFix('src/components/people/InteractionModal.tsx');
