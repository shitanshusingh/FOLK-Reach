const fs = require('fs');
let code = fs.readFileSync('src/app/campaigns/[id]/page.tsx', 'utf8');

const csvLogic = `
  const downloadCSV = () => {
    const headers = ["Name", "Phone", "Assigned Member", "Status", "Notes", "Duration (mins)", "Call Date"];
    const rows = visibleLeads.map(l => {
       const u = teamUsers?.find(u => String(u.id) === String(l.assignedToUserId));
       return [
         l.name,
         l.phone,
         u?.name || l.assignedToUserId,
         l.status,
         l.callNotes ? l.callNotes.replace(/,/g, " ") : "",
         l.durationMinutes || 0,
         l.lastCalledAt ? new Date(l.lastCalledAt).toLocaleString() : ""
       ];
    });
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", \`campaign_responses_\${campaignId}.csv\`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (`;

code = code.replace('  return (', csvLogic);

fs.writeFileSync('src/app/campaigns/[id]/page.tsx', code, 'utf8');
