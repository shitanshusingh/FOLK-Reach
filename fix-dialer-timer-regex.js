const fs = require('fs');

let content = fs.readFileSync('src/components/people/QuickDialerModal.tsx', 'utf8');

// Replace state
content = content.replace(/const \[durationMinutes, setDurationMinutes\] = useState<number \| "">\(""\);/,
\`const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);\`);

// Replace useEffect
content = content.replace(/\/\/ Handle return from native dialer[\s\S]*?\}, \[isCalling, startTime\]\);/,
\`// Handle return from native dialer & live timer
  useEffect(() => {
    if (!isCalling || !startTime) return;

    const updateTimer = () => {
      const elapsedMs = Date.now() - startTime;
      const totalSecs = Math.floor(elapsedMs / 1000);
      setElapsedSeconds(totalSecs);
      
      if (!isManuallyEdited) {
        setDurationMinutes(Math.max(1, Math.ceil(totalSecs / 60)));
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateTimer();
      }
    };
    
    const interval = setInterval(updateTimer, 1000);

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [isCalling, startTime, isManuallyEdited]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return \\\`\${m}:\${s}\\\`;
  };\`);

// Replace render
content = content.replace(/<h3>Call in progress\.\.\.<\/h3>[\s\S]*?placeholder="e\.g\. 5"[\s\S]*?\/>/,
\`<h3>Call in progress...</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-text)', margin: '16px 0', fontFamily: 'monospace' }}>
                  {formatTime(elapsedSeconds)}
                </div>
                <p style={{ color: 'var(--color-text-muted)' }}>Timer continues running in the background.</p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Call Duration (minutes)</label>
                <input 
                  type="number"
                  min="0"
                  className={styles.input} 
                  value={durationMinutes}
                  onChange={e => {
                    setIsManuallyEdited(true);
                    setDurationMinutes(e.target.value ? Number(e.target.value) : "");
                  }}
                  placeholder="e.g. 5"
                />\`);

fs.writeFileSync('src/components/people/QuickDialerModal.tsx', content, 'utf8');
console.log('Modified QuickDialerModal.tsx via Regex');
