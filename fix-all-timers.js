const fs = require('fs');

function fixModal(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('isManuallyEdited')) {
    const stateTarget = `  const [durationMinutes, setDurationMinutes] = useState<number | "">("");`;
    const stateReplacement = `  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);`;
    content = content.replace(stateTarget, stateReplacement);

    const useEffectTarget = `  useEffect(() => {
    if (type !== 'CALL') return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const elapsedMs = Date.now() - startTime;
        const elapsedMins = Math.round(elapsedMs / 60000);
        // Only auto-fill if they haven't manually edited it already, or if it's currently empty
        setDurationMinutes(prev => prev === "" ? Math.max(1, elapsedMins) : prev);
      }
    };
    
    // Also run a simple timer just in case they never background the app
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

    const useEffectReplacement = `  useEffect(() => {
    if (type !== 'CALL') return;

    const updateTimer = () => {
      const elapsedMs = Date.now() - startTime;
      const totalSecs = Math.floor(elapsedMs / 1000);
      
      if (!isManuallyEdited) {
        setDurationMinutes(Math.max(1, Math.ceil(totalSecs / 60)));
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateTimer();
      }
    };
    
    const interval = setInterval(updateTimer, 5000);

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [type, startTime, isManuallyEdited]);`;
    content = content.replace(useEffectTarget, useEffectReplacement);
    
    // Replace the onChange
    const onChangeRegex = /onChange=\{e => setDurationMinutes\(e\.target\.value \? Number\(e\.target\.value\) : ""\)\}/g;
    content = content.replace(onChangeRegex, `onChange={e => { setIsManuallyEdited(true); setDurationMinutes(e.target.value ? Number(e.target.value) : ""); }}`);
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Modified ' + file);
  }
}

fixModal('src/components/dashboard/LogInteractionModal.tsx');
fixModal('src/components/people/InteractionModal.tsx');
