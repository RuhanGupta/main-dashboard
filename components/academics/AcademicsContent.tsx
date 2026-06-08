'use client';
import { useEffect, useState } from 'react';
import { Plus, BookOpen, Filter } from 'lucide-react';
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
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Assignment
        </Button>
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
    </div>
  );
}
