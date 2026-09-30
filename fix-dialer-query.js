const fs = require('fs');
let code = fs.readFileSync('src/app/campaigns/[id]/dialer/page.tsx', 'utf8');

const oldRawLeads = `const rawLeads = useLiveQuery(async () => {
    if (!currentUser) return [];
    const list = await db.campaignLeads.toArray();
    return list.filter(l => 
      String(l.campaignId) === String(campaignId) && 
      String(l.assignedToUserId) === String(currentUser.id) &&
      l.status === 'PENDING'
    );
  }, [campaignId, currentUser]);`;

const newRawLeads = `const rawLeads = useLiveQuery(async () => {
    if (!currentUser) return [];
    const list = await db.campaignLeads.toArray();
    return list.filter(l => 
      String(l.campaignId) === String(campaignId) && 
      String(l.assignedToUserId) === String(currentUser.id)
    );
  }, [campaignId, currentUser]);
  
  // Auto-seek to the first PENDING lead on mount
  useEffect(() => {
    if (rawLeads && rawLeads.length > 0 && currentIndex === 0) {
      const firstPendingIndex = rawLeads.findIndex(l => l.status === 'PENDING');
      if (firstPendingIndex > 0) {
        setCurrentIndex(firstPendingIndex);
      }
    }
  }, [rawLeads?.length]);`;

code = code.replace(oldRawLeads, newRawLeads);

const oldNextLead = `        // 4. Next Lead
        setElapsedSeconds(0);
        setIsTimerRunning(false);
        setNotes("");
        // no op`;
const newNextLead = `        // 4. Next Lead
        setElapsedSeconds(0);
        setIsTimerRunning(false);
        setNotes("");
        if (currentIndex < rawLeads.length - 1) {
          setCurrentIndex(i => i + 1);
        }`;
code = code.replace(oldNextLead, newNextLead);

fs.writeFileSync('src/app/campaigns/[id]/dialer/page.tsx', code, 'utf8');
