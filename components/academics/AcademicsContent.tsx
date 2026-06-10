'use client';
import { useEffect, useState } from 'react';
import { Plus, BookOpen, Filter, Share2, Copy, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IAssignment } from '@/types';
import { AssignmentCard } from './AssignmentCard';
import { AssignmentForm } from './AssignmentForm';
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
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Academics</h1>
            <p className="text-sm text-gray-500">{assignments.length} assignments total</p>
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

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-gray-400" />
        {['all', 'not_started', 'in_progress', 'completed'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterStatus === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'All' : s === 'not_started' ? 'Not Started' : s === 'in_progress' ? 'In Progress' : 'Completed'}
          </button>
        ))}
      </div>

      {/* Assignments by course */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No assignments yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "New Assignment" to add your first one</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([course, items]) => (
            <div key={course}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{course}</h2>
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
          <p className="text-sm text-gray-600">
            Share this link with your counselor. They can view your visible assignments and extracurricular projects — nothing you&apos;ve marked as hidden will appear.
          </p>
          {shareLoading ? (
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 truncate font-mono select-all">
                {shareUrl}
              </div>
              <Button size="sm" variant="outline" onClick={copyLink} className="flex-shrink-0">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-400">Use the eye icon on assignments and tasks to control what&apos;s visible.</p>
            <button
              onClick={regenerateLink}
              disabled={shareLoading}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> New link
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
