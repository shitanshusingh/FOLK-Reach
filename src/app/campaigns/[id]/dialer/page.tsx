"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
import { Phone, ThumbsUp, ThumbsDown, RotateCcw, ArrowLeft, User, CalendarClock, Minus, PhoneOff, CheckCircle } from "lucide-react";
import { QuickAddContact } from "@/components/people/QuickAddContact";

function CampaignDialerContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  
  const campaignId = params.id as string;
  const mode = searchParams.get('mode') || 'all'; // 'retry' | 'pending' | 'all'

  const rawLeads = useLiveQuery(async () => {
    if (!currentUser) return [];
    const list = await db.campaignLeads.toArray();
    const userLeads = list.filter(l => 
      String(l.campaignId) === String(campaignId) && 
      String(l.assignedToUserId) === String(currentUser.id)
    );
    // If user is a leader and has no specifically assigned leads, allow dialing campaign leads
    if (userLeads.length === 0 && ["LEADER", "FOLK_LEADER", "ADMIN", "SUPER_ADMIN", "FOLK_GUIDE"].includes(currentUser.role)) {
      return list.filter(l => String(l.campaignId) === String(campaignId));
    }
    return userLeads;
  }, [campaignId, currentUser]);

  // Stable session queue containing IDs of leads to dial in this session
  const [queueIds, setQueueIds] = useState<string[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Initialize queue once when rawLeads is loaded
  useEffect(() => {
    if (rawLeads && queueIds === null) {
      const pending = rawLeads.filter(l => l.status === 'PENDING');
      const noAnswer = rawLeads.filter(l => l.status === 'NO_ANSWER');

      let targetLeads: any[] = [];
      if (mode === 'retry') {
        targetLeads = noAnswer;
      } else if (mode === 'pending') {
        targetLeads = pending;
      } else {
        // Default: uncalled pending leads first, then no answer retries
        targetLeads = [...pending, ...noAnswer];
      }

      setQueueIds(targetLeads.map(l => String(l.id)));
      setCurrentIndex(0);
    }
  }, [rawLeads, queueIds, mode]);

  const [isCalling, setIsCalling] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasHidden, setHasHidden] = useState(false);
  
  // Disposition State
  const [notes, setNotes] = useState("");
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Current lead lookup from rawLeads via stable queueId
  const currentLeadId = queueIds && queueIds.length > 0 ? queueIds[currentIndex] : null;
  const currentLead = rawLeads && currentLeadId ? rawLeads.find(l => String(l.id) === currentLeadId) : null;

  // Sync notes when current lead changes
  useEffect(() => {
    if (currentLead) {
      setNotes(currentLead.callNotes || "");
    }
  }, [currentLead?.id]);

  // Timer Logic
  useEffect(() => {
    if (!isCalling || !startTime) return;

    const updateTimer = () => {
      if (!isTimerRunning) return;
      const totalSecs = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(totalSecs);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setHasHidden(true);
      } else if (document.visibilityState === 'visible') {
        updateTimer();
        if (hasHidden) {
          setIsTimerRunning(false);
        }
      }
    };
    
    const interval = setInterval(updateTimer, 1000);
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [isCalling, startTime, isTimerRunning, hasHidden]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const resetState = () => {
    setIsCalling(false);
    setStartTime(null);
    setElapsedSeconds(0);
    setIsTimerRunning(false);
    setNotes("");
  };

  if (!currentUser || !rawLeads || queueIds === null) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading dialer queue...</p>
      </div>
    );
  }

  if (queueIds.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle size={64} style={{ color: '#10b981', marginBottom: 20 }} />
        <h1>You're All Caught Up!</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 30 }}>
          {mode === 'retry' 
            ? "No 'No Answer' leads left to retry for this campaign." 
            : mode === 'pending'
            ? "No new uncalled leads left for this campaign."
            : "You have no pending or unanswered calls remaining for this campaign."}
        </p>
        <button className="primary-btn" onClick={() => router.push(`/campaigns/${campaignId}`)}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!currentLead) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle size={64} style={{ color: '#10b981', marginBottom: 20 }} />
        <h1>Calling Session Finished!</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 30 }}>You have reached the end of this calling queue.</p>
        <button className="primary-btn" onClick={() => router.push(`/campaigns/${campaignId}`)}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handleDial = () => {
    if (!currentLead.phone) return;
    setIsCalling(true);
    setStartTime(Date.now());
    setElapsedSeconds(0);
    setIsTimerRunning(true);
    setHasHidden(false);

    // Format strictly for native OS dialer to prevent blank screens
    const digitsOnly = currentLead.phone.replace(/\D/g, '');
    const dialNumber = digitsOnly.length === 10 ? `+91${digitsOnly}` : digitsOnly;
    window.location.href = `tel:${dialNumber}`;
  };

  const handleDisposition = async (outcomeStatus: 'INTERESTED' | 'NOT_INTERESTED' | 'NO_ANSWER' | 'FOLLOW_UP' | 'AVERAGE') => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const durationMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));

      // 1. Update Lead Status
      await db.campaignLeads.update(currentLead.id as string, {
        status: currentLead.personId ? 'CONVERTED' : outcomeStatus,
        callNotes: notes,
        durationMinutes: isCalling ? durationMinutes : (currentLead.durationMinutes || 0),
        lastCalledAt: new Date().toISOString()
      });

      // 2. Log Interaction to User Analytics
      await db.interactions.add({
        personId: currentLead.personId || "UNSAVED_CALL",
        userId: currentUser.id,
        type: 'CALL',
        notes: `Campaign Call: ${currentLead.name}. Result: ${outcomeStatus}. Notes: ${notes}`,
        date: new Date().toISOString(),
      });

      // 3. Move to Next Lead in Queue
      resetState();
      
      if (currentIndex >= queueIds.length - 1) {
        router.push(`/campaigns/${campaignId}`);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
      
    } catch (error) {
      console.error(error);
      alert("Failed to save disposition");
    } finally {
      setIsSubmitting(false);
    }
  };

  const backLead = () => {
    resetState();
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  };

  const skipLead = () => {
    resetState();
    if (currentIndex < queueIds.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      router.push(`/campaigns/${campaignId}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-gradient)' }}>
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        
        <div style={{ background: 'rgba(20,20,25,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-xl)', padding: '40px 24px', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column', alignItems: 'center', backdropFilter: 'blur(20px)' }}>
          
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 0 20px rgba(124,58,237,0.2)' }}>
            <User size={40} style={{ color: '#c4b5fd' }} />
          </div>

          {/* Lead Context Badge */}
          {currentLead.status === 'NO_ANSWER' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 20, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700, marginBottom: 16 }}>
              <RotateCcw size={13} /> Retry Call (No Answer Previously)
            </div>
          )}
          {currentLead.status === 'PENDING' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 20, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700, marginBottom: 16 }}>
              Fresh Lead (Uncalled)
            </div>
          )}
          {currentLead.status !== 'PENDING' && currentLead.status !== 'NO_ANSWER' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 20, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700, marginBottom: 16 }}>
              <CheckCircle size={13} /> Recorded: {currentLead.status}
            </div>
          )}

          <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, color: 'var(--color-text)', lineHeight: 1.2 }}>
            {currentLead.name}
          </div>
          <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', color: '#fff', marginBottom: 28, letterSpacing: '1px', opacity: 0.9 }}>
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
              <div style={{ fontSize: '4rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-text)', marginBottom: 32, letterSpacing: '2px', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
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
                  
                  {!currentLead.personId && (
                    <div style={{ marginTop: 24, textAlign: 'center' }}>
                      <button 
                        onClick={() => setShowAddContactModal(true)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '10px 20px', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                      >
                        + Create CRM Contact for this Lead
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {showAddContactModal && (
        <QuickAddContact 
          onClose={() => setShowAddContactModal(false)}
          personToEdit={{ name: currentLead.name, phone: currentLead.phone }}
          onSuccess={async (newPersonId) => {
             await db.campaignLeads.update(currentLead.id as string, { personId: newPersonId, status: 'CONVERTED' });
             setShowAddContactModal(false);
          }}
        />
      )}

      {/* Bottom Action Bar */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,25,0.8)', backdropFilter: 'blur(20px)', marginTop: 'auto' }}>
        <button onClick={() => router.push(`/campaigns/${campaignId}`)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, padding: '10px 16px', borderRadius: 'var(--radius-full)' }}>
          <ArrowLeft size={16} /> Exit
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={backLead} disabled={currentIndex === 0} style={{ background: 'transparent', border: 'none', color: currentIndex === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', cursor: currentIndex === 0 ? 'default' : 'pointer', fontWeight: 600 }}>
            &larr; Back
          </button>
          <div style={{ fontSize: '0.85rem', color: '#c4b5fd', fontWeight: 700, background: 'rgba(124,58,237,0.15)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(124,58,237,0.3)' }}>
            {currentIndex + 1} of {queueIds.length}
          </div>
          <button onClick={skipLead} disabled={currentIndex >= queueIds.length - 1} style={{ background: 'transparent', border: 'none', color: currentIndex >= queueIds.length - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', cursor: currentIndex >= queueIds.length - 1 ? 'default' : 'pointer', fontWeight: 600 }}>
            Skip &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CampaignDialerPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>Loading dialer...</div>}>
      <CampaignDialerContent />
    </Suspense>
  );
}
