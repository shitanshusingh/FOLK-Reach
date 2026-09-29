const fs = require('fs');

let css = fs.readFileSync('src/app/campaigns/[id]/CampaignDetails.module.css', 'utf8');

const mediaQueries = `
@media (max-width: 768px) {
  .headerFlex {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 16px;
  }
  .headerFlex button {
    width: 100%;
    justify-content: center;
  }
  .statsCard {
    flex-direction: column;
    gap: 12px;
  }
  .statBox {
    padding: 16px;
  }
  .statNumber {
    font-size: 2rem;
  }
  .table th, .table td {
    padding: 12px 16px;
    font-size: 0.85rem;
  }
}
`;

if (!css.includes('@media (max-width: 768px)')) {
  fs.writeFileSync('src/app/campaigns/[id]/CampaignDetails.module.css', css + mediaQueries, 'utf8');
}

let page = fs.readFileSync('src/app/campaigns/[id]/page.tsx', 'utf8');
page = page.replace(
  /<div style=\{\{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' \}\}>/,
  '<div className={styles.headerFlex} style={{ display: \'flex\', justifyContent: \'space-between\', width: \'100%\', alignItems: \'center\' }}>'
);
fs.writeFileSync('src/app/campaigns/[id]/page.tsx', page, 'utf8');
console.log('Fixed CampaignDetails UI');
