const fs = require('fs');
let code = fs.readFileSync('src/app/campaigns/[id]/page.tsx', 'utf8');

// 1. Add EditCampaignModal import and icons
code = code.replace(
  'import { PhoneCall, ArrowLeft, Play, User, Clock, CheckCircle } from "lucide-react";',
  'import { PhoneCall, ArrowLeft, Play, User, Clock, CheckCircle, Edit, Trash2, Download } from "lucide-react";\nimport { EditCampaignModal } from "@/components/campaigns/EditCampaignModal";'
);

// 2. Add state for edit modal
code = code.replace(
  'const campaignId = params.id as string;',
  'const campaignId = params.id as string;\n  const [showEditModal, setShowEditModal] = useState(false);'
);

// 3. Add Delete logic
const deleteLogic = `
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this entire campaign? This cannot be undone.")) return;
    try {
      await db.campaigns.delete(campaignId);
      for (const l of rawLeads) {
         await db.campaignLeads.delete(l.id as string);
      }
      router.push('/campaigns');
    } catch(e) {
      console.error(e);
      alert("Error deleting campaign");
    }
  };
`;
code = code.replace('const [searchQuery, setSearchQuery] = useState("");', deleteLogic + '\n  const [searchQuery, setSearchQuery] = useState("");');

// 4. Add CSV Download logic
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
`;
code = code.replace('const downloadCSV', '// (removed)'); // just in case
code = code.replace('const filteredAssignee =', csvLogic + '\n  const filteredAssignee =');

// 5. Update UI with Edit/Delete buttons (if admin/creator)
const oldHeader = `<div className={styles.headerFlex} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>
            <h1 style={{ fontSize: '2.5rem', lineHeight: 1.1, marginBottom: 8 }}>{campaign.title}</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>{campaign.description}</p>
          </div>
          <button 
            className="primary-btn" 
            style={{ padding: '12px 24px', fontSize: '1.1rem' }}
            disabled={pendingLeads.length === 0}
            onClick={() => router.push(\`/campaigns/\${campaignId}/dialer\`)}
          >
            <Play size={20} /> {pendingLeads.length === 0 ? "All Done!" : "Start Calling"}
          </button>
        </div>`;

const newHeader = `<div className={styles.headerFlex} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%', flex: 1 }}>
            <h1 style={{ fontSize: '2.5rem', lineHeight: 1.1, marginBottom: 8 }}>{campaign.title}</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>{campaign.description}</p>
            
            {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'FOLK_GUIDE' || String(campaign.createdByUserId) === String(currentUser?.id)) && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowEditModal(true)} style={{ background: 'var(--color-surface)', border: '1px solid var(--glass-border)', color: 'var(--color-text)', padding: '6px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', cursor: 'pointer' }}>
                  <Edit size={16} /> Edit
                </button>
                <button onClick={handleDelete} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '6px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', cursor: 'pointer' }}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            )}
          </div>
          <button 
            className="primary-btn" 
            style={{ padding: '12px 24px', fontSize: '1.1rem', flexShrink: 0, marginLeft: 16 }}
            disabled={pendingLeads.length === 0}
            onClick={() => router.push(\`/campaigns/\${campaignId}/dialer\`)}
          >
            <Play size={20} /> {pendingLeads.length === 0 ? "All Done!" : "Start Calling"}
          </button>
        </div>`;
code = code.replace(oldHeader, newHeader);

// 6. Update Table Header with Download Button
const oldTableHeader = `<div className={styles.tableHeader}>
          <h2>Lead Responses</h2>
          <p>You can see responses here and restart the dialer to retry 'No Answer' leads.</p>
        </div>`;
        
const newTableHeader = `<div className={styles.tableHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2>Lead Responses</h2>
            <p>You can see responses here and restart the dialer to retry 'No Answer' leads.</p>
          </div>
          <button onClick={downloadCSV} style={{ background: 'var(--color-surface)', border: '1px solid var(--glass-border)', color: 'var(--color-text)', padding: '8px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
            <Download size={18} /> Export CSV
          </button>
        </div>`;
code = code.replace(oldTableHeader, newTableHeader);

// 7. Add EditModal at bottom
const editModalComponent = `
      {showEditModal && teamUsers && (
        <EditCampaignModal 
          campaign={campaign} 
          teamUsers={teamUsers} 
          onClose={() => setShowEditModal(false)} 
        />
      )}
    </div>
  );
`;
code = code.replace('    </div>\n  );\n', editModalComponent);

fs.writeFileSync('src/app/campaigns/[id]/page.tsx', code, 'utf8');
