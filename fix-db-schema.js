const fs = require('fs');

let content = fs.readFileSync('src/lib/db.ts', 'utf8');

const newInterfaces = `
export interface Campaign {
  id?: string | number;
  title: string;
  description?: string;
  creatorId: string | number;
  teamId?: string | number;
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: Date | string;
}

export interface CampaignLead {
  id?: string | number;
  campaignId: string | number;
  name: string;
  phone: string;
  hostel?: string;
  status: 'PENDING' | 'INTERESTED' | 'NOT_INTERESTED' | 'NO_ANSWER' | 'CONVERTED';
  assignedToUserId?: string | number;
  callNotes?: string;
  durationMinutes?: number;
  lastCalledAt?: Date | string;
}
`;

content = content.replace(/export interface ContactTransfer/, newInterfaces + '\nexport interface ContactTransfer');

content = content.replace(
  /customGroups: createCollectionProxy\('customGroups'\),/,
  `customGroups: createCollectionProxy('customGroups'),
  campaigns: createCollectionProxy('campaigns'),
  campaignLeads: createCollectionProxy('campaignLeads'),`
);

fs.writeFileSync('src/lib/db.ts', content, 'utf8');
console.log('Updated db.ts with Campaign schema');
