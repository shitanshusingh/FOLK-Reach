const fs = require('fs');

function injectLiveTimer(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Add state for elapsedSeconds
  content = content.replace(
    /const \[isManuallyEdited, setIsManuallyEdited\] = useState\(false\);/,
    \`const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);\`
  );

  // Update useEffect to track elapsedSeconds
  content = content.replace(
    /const totalSecs = Math\.floor\(elapsedMs \/ 1000\);/,
    \`const totalSecs = Math.floor(elapsedMs / 1000);
      setElapsedSeconds(totalSecs);\`
  );
  
  // Make the interval 1000ms instead of 5000ms
  content = content.replace(
    /const interval = setInterval\(updateTimer, 5000\);/,
    \`const interval = setInterval(updateTimer, 1000);\`
  );
  
  // Add formatTime helper right before the render (before return ( <div className={styles.modalOverlay}> ))
  if (!content.includes('const formatTime =')) {
    content = content.replace(
      /return \(\s*<div className=\{styles\.modalOverlay\}>/g,
      \`const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return \\\`\${m}:\${s}\\\`;
  };

  return (
    <div className={styles.modalOverlay}>\`
    );
  }

  // Update UI to show live timer
  content = content.replace(
    /<label className=\{styles\.label\}>Call Duration \(minutes\)<\/label>/,
    \`<label className={styles.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Call Duration (minutes)</span>
                    {!isManuallyEdited && elapsedSeconds > 0 && (
                      <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: 4 }}>
                        {formatTime(elapsedSeconds)}
                      </span>
                    )}
                  </label>\`
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('Injected live timer into ' + file);
}

injectLiveTimer('src/components/dashboard/LogInteractionModal.tsx');
injectLiveTimer('src/components/people/InteractionModal.tsx');
