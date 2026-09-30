const fs = require('fs');
let code = fs.readFileSync('src/app/campaigns/[id]/dialer/page.tsx', 'utf8');

// 1. Add import
code = code.replace(
  'import { Phone, X, ThumbsUp, ThumbsDown, RotateCcw, AlertTriangle, ArrowLeft, User, CalendarClock, Minus, PhoneOff, CheckCircle } from "lucide-react";',
  'import { Phone, X, ThumbsUp, ThumbsDown, RotateCcw, AlertTriangle, ArrowLeft, User, CalendarClock, Minus, PhoneOff, CheckCircle } from "lucide-react";\nimport { QuickAddContact } from "@/components/people/QuickAddContact";'
);

// 2. Change state
code = code.replace(
  'const [convertToContact, setConvertToContact] = useState(true);',
  'const [showAddContactModal, setShowAddContactModal] = useState(false);'
);

// 3. Remove contact creation from handleDisposition
code = code.replace(
  /        \/\/ 3\. Optional: Create Contact[\s\S]*?        \/\/ 4\. Next Lead/m,
  '        // 4. Next Lead'
);

// 4. Update status conversion
code = code.replace(
  /status: \(outcomeStatus === 'INTERESTED' && convertToContact\) \? 'CONVERTED' : outcomeStatus,/,
  "status: currentLead.personId ? 'CONVERTED' : outcomeStatus,"
);

// 5. Update resetState
code = code.replace(
  'setConvertToContact(true);',
  '// no op'
);

// 6. Add backLead function
code = code.replace(
  'const skipLead = () => {',
  'const backLead = () => {\n    resetState();\n    if (currentIndex > 0) setCurrentIndex(i => i - 1);\n  };\n\n  const skipLead = () => {'
);

// 7. Replace the checkbox with a button
const oldCheckbox = `<div style={{ marginTop: 24, textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: '1px solid var(--glass-border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: '0.95rem' }}>
                      <input 
                        type="checkbox" 
                        checked={convertToContact}
                        onChange={e => setConvertToContact(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                      />
                      Save to Main CRM Contact List
                    </label>
                  </div>`;
                  
const newButton = `{!currentLead.personId && (
                    <div style={{ marginTop: 24, textAlign: 'center' }}>
                      <button 
                        onClick={() => setShowAddContactModal(true)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '10px 20px', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                      >
                        + Create CRM Contact for this Lead
                      </button>
                    </div>
                  )}`;
code = code.replace(oldCheckbox, newButton);

// 8. Add the QuickAddContact Modal below the main container
const oldEnd = `        </div>
      </div>

      {/* Bottom Action Bar */}`;
const newEnd = `        </div>
      </div>
      
      {showAddContactModal && (
        <QuickAddContact 
          onClose={() => setShowAddContactModal(false)}
          personToEdit={{ name: currentLead.name, phone: currentLead.phone }}
          onSuccess={async (newPersonId) => {
             await db.campaignLeads.update(currentLead.id as string, { personId: newPersonId });
             setShowAddContactModal(false);
          }}
        />
      )}

      {/* Bottom Action Bar */}`;
code = code.replace(oldEnd, newEnd);

// 9. Update the bottom action bar with Back and Skip
const oldBottomBar = `<button onClick={() => router.push(\`/campaigns/\${campaignId}\`)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, padding: '10px 16px', borderRadius: 'var(--radius-full)' }}>
          <ArrowLeft size={16} /> Exit
        </button>
        <div style={{ fontSize: '0.85rem', color: '#c4b5fd', fontWeight: 700, background: 'rgba(124,58,237,0.15)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(124,58,237,0.3)' }}>
          {currentIndex + 1} of {rawLeads.length}
        </div>
        <button onClick={skipLead} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600 }}>
          Skip &rarr;
        </button>`;

const newBottomBar = `<button onClick={() => router.push(\`/campaigns/\${campaignId}\`)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, padding: '10px 16px', borderRadius: 'var(--radius-full)' }}>
          <ArrowLeft size={16} /> Exit
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={backLead} disabled={currentIndex === 0} style={{ background: 'transparent', border: 'none', color: currentIndex === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', cursor: currentIndex === 0 ? 'default' : 'pointer', fontWeight: 600 }}>
            &larr; Back
          </button>
          <div style={{ fontSize: '0.85rem', color: '#c4b5fd', fontWeight: 700, background: 'rgba(124,58,237,0.15)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(124,58,237,0.3)' }}>
            {currentIndex + 1} of {rawLeads.length}
          </div>
          <button onClick={skipLead} disabled={currentIndex >= rawLeads.length - 1} style={{ background: 'transparent', border: 'none', color: currentIndex >= rawLeads.length - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', cursor: currentIndex >= rawLeads.length - 1 ? 'default' : 'pointer', fontWeight: 600 }}>
            Skip &rarr;
          </button>
        </div>`;
code = code.replace(oldBottomBar, newBottomBar);

fs.writeFileSync('src/app/campaigns/[id]/dialer/page.tsx', code, 'utf8');
