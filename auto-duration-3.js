const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

const stateTargetStr = `  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [isSaving, setIsSaving] = useState(false);`;
const stateReplacementStr = `  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [isSaving, setIsSaving] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
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
  }, [startTime]);`;

content = content.replace(stateTargetStr, stateReplacementStr);
fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
console.log('Modified CallOutcomeModal in sessions page');
