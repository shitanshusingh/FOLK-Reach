const fs = require('fs');

let content = fs.readFileSync('src/app/campaigns/[id]/dialer/page.tsx', 'utf8');

const returnStatementRegex = /return \([\s\S]*?\);\n\}/m;

const newReturn = `return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-gradient)' }}>
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)', padding: '40px 24px', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}>
            <User size={40} style={{ color: '#c4b5fd' }} />
          </div>

          <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, color: 'var(--color-text)', lineHeight: 1.2 }}>
            {currentLead.name}
          </div>
          <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', color: '#c4b5fd', marginBottom: 32, letterSpacing: '1px' }}>
            {currentLead.phone}
          </div>

          {!isCalling ? (
            <button 
              onClick={handleDial}
              style={{ background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '20px 40px', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, margin: '0 auto', cursor: 'pointer', boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)', transition: 'transform 0.2s', width: '100%', justifyContent: 'center' }}
            >
              <Phone size={24} /> Start Call
            </button>
          ) : (
            <div style={{ animation: 'fadeIn 0.3s ease-out', width: '100%' }}>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: 12 }}>Call in Progress</h3>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-text)', marginBottom: 32, letterSpacing: '2px', textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>
                {formatTime(elapsedSeconds)}
              </div>

              {isTimerRunning ? (
                <button 
                  onClick={() => setIsTimerRunning(false)}
                  style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', padding: '16px', borderRadius: 'var(--radius-full)', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontSize: '1.1rem', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)', marginBottom: 10 }}
                >
                  <PhoneOff size={24} /> End Call
                </button>
              ) : (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ textAlign: 'left', marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Call Notes</label>
                    <textarea 
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="What did you discuss?"
                      style={{ width: '100%', minHeight: '80px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: 12, color: 'white', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <button 
                      disabled={isSubmitting}
                      onClick={() => handleDisposition('INTERESTED')}
                      style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '12px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                    >
                      <ThumbsUp size={20} /> Interested
                    </button>
                    <button 
                      disabled={isSubmitting}
                      onClick={() => handleDisposition('FOLLOW_UP')}
                      style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6', padding: '12px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                    >
                      <CalendarClock size={20} /> Follow Up
                    </button>
                    <button 
                      disabled={isSubmitting}
                      onClick={() => handleDisposition('AVERAGE')}
                      style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', color: '#f59e0b', padding: '12px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                    >
                      <Minus size={20} /> Average
                    </button>
                    <button 
                      disabled={isSubmitting}
                      onClick={() => handleDisposition('NOT_INTERESTED')}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                    >
                      <ThumbsDown size={20} /> Not Interested
                    </button>
                  </div>
                  
                  <button 
                    disabled={isSubmitting}
                    onClick={() => handleDisposition('NO_ANSWER')}
                    style={{ width: '100%', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid #a855f7', color: '#a855f7', padding: '12px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                  >
                    <RotateCcw size={20} /> No Answer (Retry Later)
                  </button>
                  
                  <div style={{ marginTop: 24, textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: '1px solid var(--glass-border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: '0.95rem' }}>
                      <input 
                        type="checkbox" 
                        checked={convertToContact}
                        onChange={e => setConvertToContact(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                      />
                      Save to Main CRM Contact List
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', marginTop: 'auto' }}>
        <button onClick={() => router.push(\`/campaigns/\${campaignId}\`)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, padding: '10px 16px', borderRadius: 'var(--radius-full)' }}>
          <ArrowLeft size={16} /> Exit Dialer
        </button>
        <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 700, background: 'var(--color-primary-light)', padding: '6px 16px', borderRadius: 'var(--radius-full)' }}>
          Lead {currentIndex + 1} of {rawLeads.length}
        </div>
        <button onClick={skipLead} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 600 }}>
          Skip &rarr;
        </button>
      </div>
    </div>
  );
}`;

content = content.replace(returnStatementRegex, newReturn);
fs.writeFileSync('src/app/campaigns/[id]/dialer/page.tsx', content, 'utf8');
console.log('Fixed dialer interaction flow 2');
