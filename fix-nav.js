const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Navigation.tsx', 'utf8');

// Add PhoneCall to lucide-react imports if not there
if (!content.includes('PhoneCall')) {
  content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1, PhoneCall } from 'lucide-react';");
}

content = content.replace(
  /\{ name: 'Follow-ups', href: '\/tasks', icon: CheckSquare \},/,
  `{ name: 'Follow-ups', href: '/tasks', icon: CheckSquare },
    { name: 'Campaigns', href: '/campaigns', icon: PhoneCall },`
);

fs.writeFileSync('src/components/layout/Navigation.tsx', content, 'utf8');
console.log('Added Campaigns to navigation');
