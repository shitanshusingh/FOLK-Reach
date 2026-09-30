const fs = require('fs');

// 1. Update page.tsx to pass rawLeads
let page = fs.readFileSync('src/app/campaigns/[id]/page.tsx', 'utf8');
page = page.replace(
  '<EditCampaignModal \n            campaign={campaign} \n            teamUsers={teamUsers} \n            onClose={() => setShowEditModal(false)} \n          />',
  '<EditCampaignModal \n            campaign={campaign} \n            teamUsers={teamUsers} \n            rawLeads={rawLeads}\n            onClose={() => setShowEditModal(false)} \n          />'
);
fs.writeFileSync('src/app/campaigns/[id]/page.tsx', page, 'utf8');

// 2. Update EditCampaignModal.tsx
let modal = fs.readFileSync('src/components/campaigns/EditCampaignModal.tsx', 'utf8');
modal = modal.replace(
  'export function EditCampaignModal({ campaign, onClose, teamUsers }: { campaign: any; onClose: () => void; teamUsers: any[] }) {',
  'export function EditCampaignModal({ campaign, onClose, teamUsers, rawLeads }: { campaign: any; onClose: () => void; teamUsers: any[]; rawLeads: any[] }) {'
);
modal = modal.replace(
  'const [selectedAssignees, setSelectedAssignees] = useState<string[]>(campaign.assigneeIds || []);',
  `// Derive initial assignees dynamically from pending leads (since we didn't store assigneeIds historically)
  const initialAssignees = Array.from(new Set(rawLeads.filter(l => l.status === 'PENDING' || l.status === 'NO_ANSWER').map(l => String(l.assignedToUserId))));
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(initialAssignees);`
);

// 3. Update the handleUpdate logic to use initialAssignees instead of campaign.assigneeIds
modal = modal.replace(
  'const removedAssignees = campaign.assigneeIds.filter((id: string) => !selectedAssignees.includes(id));',
  'const removedAssignees = initialAssignees.filter((id: string) => !selectedAssignees.includes(id));'
);

fs.writeFileSync('src/components/campaigns/EditCampaignModal.tsx', modal, 'utf8');
