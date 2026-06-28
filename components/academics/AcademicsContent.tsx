'use client';
import { useEffect, useState } from 'react';
import { Plus, BookOpen, Filter, Share2, Copy, Check, RefreshCw, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IAssignment } from '@/types';
import { AssignmentCard } from './AssignmentCard';
import { AssignmentForm } from './AssignmentForm';
import { AcademicRecurringPlanner } from './AcademicRecurringPlanner';
import { Modal } from '@/components/ui/modal';

export function AcademicsContent() {
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/counselor/${shareToken}`
    : '';

  const openShareModal = async () => {
    setShowShareModal(true);
    if (!shareToken) {
      setShareLoading(true);
      const res = await fetch('/api/counselor-share');
      const data = await res.json();
      setShareToken(data.token);
      setShareLoading(false);
    }
  };

  const regenerateLink = async () => {
    setShareLoading(true);
    const res = await fetch('/api/counselor-share', { method: 'POST' });
    const data = await res.json();
    setShareToken(data.token);
    setShareLoading(false);
    setCopied(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchAssignments = async () => {
    const res = await fetch('/api/assignments');
    const data = await res.json();
    setAssignments(data);
  };

  useEffect(() => {
    fetchAssignments().finally(() => setLoading(false));
  }, []);

  const filtered = filterStatus === 'all'
    ? assignments
    : assignments.filter(a => a.status === filterStatus);

  const grouped = filtered.reduce((acc, a) => {
    const key = a.course || 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {} as Record<string, IAssignment[]>);

  return (
    <div className="p-8 max-w-5xl mx-auto stagger">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-academic-soft border border-academic-line rounded-2xl flex items-center justify-center shadow-card">
            <BookOpen className="w-5 h-5 text-academic-deep" />
          </div>
          <div>
            <h1 className="font-serif text-[1.75rem] font-semibold text-foreground tracking-tight">Academics</h1>
            <p className="text-sm text-muted-foreground">{assignments.length} assignments total</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openShareModal}>
            <Share2 className="w-4 h-4 mr-1.5" />
            Share with Counselor
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Assignment
          </Button>
        </div>
      </div>

      {/* Filters — segmented pill control */}
      <div className="flex items-center gap-3 mb-7">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="inline-flex items-center gap-1 bg-muted/80 border border-border rounded-full p-1">
          {['all', 'not_started', 'in_progress', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                filterStatus === s
                  ? 'bg-card text-primary-deep shadow-card'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'All' : s === 'not_started' ? 'Not Started' : s === 'in_progress' ? 'In Progress' : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly recurring planner */}
      <Card className="p-5 mb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-8 h-8 rounded-xl bg-academic-soft border border-academic-line flex items-center justify-center">
            <CalendarClock className="w-4 h-4 text-academic-deep" />
          </span>
          <div>
            <h2 className="font-serif font-semibold text-foreground text-base">Weekly Recurring Planner</h2>
            <p className="text-xs text-muted-foreground">Repeating study sessions, practice, and reflection</p>
          </div>
        </div>
        <AcademicRecurringPlanner />
      </Card>

      {/* Assignments by course */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-14 text-center">
          <BookOpen className="w-12 h-12 text-border-strong mx-auto mb-3" />
          <p className="text-foreground font-serif font-medium text-lg">No assignments yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click "New Assignment" to add your first one</p>
        </Card>
      ) : (
        <div className="space-y-7">
          {Object.entries(grouped).map(([course, items]) => (
            <div key={course}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xs font-semibold text-academic-deep uppercase tracking-[0.18em]">{course}</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-academic-line to-transparent" />
              </div>
              <div className="space-y-3">
                {items.map(a => (
                  <AssignmentCard key={a._id} assignment={a} onUpdate={fetchAssignments} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Assignment">
        <AssignmentForm
          onSave={() => { setShowForm(false); fetchAssignments(); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <Modal open={showShareModal} onClose={() => setShowShareModal(false)} title="Share with Counselor">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this link with your counselor. They can view your visible assignments and extracurricular projects — nothing you&apos;ve marked as hidden will appear.
          </p>
          {shareLoading ? (
            <div className="h-10 bg-muted rounded-xl animate-pulse" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/70 border border-border rounded-xl px-3.5 py-2 text-sm text-foreground truncate font-mono select-all">
                {shareUrl}
              </div>
              <Button size="sm" variant="outline" onClick={copyLink} className="flex-shrink-0">
                {copied ? <Check className="w-3.5 h-3.5 text-success-deep animate-pop" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">Use the eye icon on assignments and tasks to control what&apos;s visible.</p>
            <button
              onClick={regenerateLink}
              disabled={shareLoading}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> New link
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
