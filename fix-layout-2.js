const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

content = content.replace(
  `}
                    </div>
                  )}

                  <div 
                    onClick={() => setActiveCallModal(record.id as number)}`,
  `}
                    </div>
                  )}
                  </div>

                  <div 
                    onClick={() => setActiveCallModal(record.id as number)}`
);

fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
