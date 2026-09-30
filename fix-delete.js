const fs = require('fs');
let code = fs.readFileSync('src/app/campaigns/[id]/page.tsx', 'utf8');

const deleteLogic = `
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this entire campaign? This cannot be undone.")) return;
    try {
      await db.campaigns.delete(campaignId);
      for (const l of rawLeads) {
         await db.campaignLeads.delete(l.id);
      }
      router.push('/campaigns');
    } catch(e) {
      console.error(e);
      alert("Error deleting campaign");
    }
  };

  const downloadCSV = () => {`;

code = code.replace('  const downloadCSV = () => {', deleteLogic);

fs.writeFileSync('src/app/campaigns/[id]/page.tsx', code, 'utf8');
