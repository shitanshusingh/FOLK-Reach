const fs = require('fs');
let content = fs.readFileSync('src/components/people/QuickDialerModal.tsx', 'utf8');

// Add the states
const stateTarget = `  const [startTime, setStartTime] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");`;
const stateReplacement = `  const [startTime, setStartTime] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);`;
content = content.replace(stateTarget, stateReplacement);

// Replace the useEffect
const useEffectTarget = `  // Handle return from native dialer
  useEffect(() => {
    if (!isCalling || !startTime) return;

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
  }, [isCalling, startTime]);`;

const useEffectReplacement = `  // Handle return from native dialer & live timer
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
    return \`\${m}:\${s}\`;
  };`;
content = content.replace(useEffectTarget, useEffectReplacement);

// Replace the render
const renderTarget = `              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Phone size={48} style={{ color: 'var(--color-primary)', marginBottom: 16, animation: 'pulse 2s infinite' }} />
                <h3>Call in progress...</h3>
                <p style={{ color: 'var(--color-text-muted)' }}>When you return, log the time below.</p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Call Duration (minutes)</label>
                <input 
                  type="number"
                  min="0"
                  className={styles.input} 
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 5"
                />
              </div>`;

const renderReplacement = `              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Phone size={48} style={{ color: 'var(--color-primary)', marginBottom: 16, animation: 'pulse 2s infinite' }} />
                <h3>Call in progress...</h3>
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
                />
                {!isManuallyEdited && elapsedSeconds > 0 && (
                  <small style={{ color: 'var(--color-primary)', marginTop: 4, display: 'block' }}>
                    Auto-tracking based on live timer.
                  </small>
                )}
              </div>`;
content = content.replace(renderTarget, renderReplacement);

fs.writeFileSync('src/components/people/QuickDialerModal.tsx', content, 'utf8');
console.log('Modified QuickDialerModal.tsx');
