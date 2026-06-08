'use client';
import { useEffect, useState } from 'react';
import { Plus, Star, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IProject } from '@/types';
import { ProjectCard } from './ProjectCard';
import { ProjectForm } from './ProjectForm';
import { Modal } from '@/components/ui/modal';
import { WeeklyTaskList } from './WeeklyTaskList';
import { addDays, subDays, startOfDay, endOfDay } from 'date-fns';

export function ExtracurricularsContent() {
  const [projects, setProjects] = useState<IProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekly' | 'all'>('weekly');

  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
  };

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const windowStart = subDays(startOfDay(today), 2);
  const windowEnd = addDays(endOfDay(today), 4);

  // Gather tasks due in rolling window
  const weeklyTasks = projects.flatMap(p =>
    p.tasks
      ?.filter((t: any) => t.dueDate && new Date(t.dueDate) >= windowStart && new Date(t.dueDate) <= windowEnd)
      .map((t: any) => ({ ...t, projectTitle: p.title, projectId: p._id })) ?? []
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Star className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Extracurriculars</h1>
            <p className="text-sm text-gray-500">{projects.length} projects</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Project
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'weekly' ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          This Week ({weeklyTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'all' ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Projects
        </button>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
      ) : activeTab === 'weekly' ? (
        <WeeklyTaskList tasks={weeklyTasks} onUpdate={fetchProjects} />
      ) : (
        <div className="space-y-4">
          {projects.length === 0 ? (
            <Card className="p-12 text-center">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No projects yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "New Project" to add one</p>
            </Card>
          ) : (
            projects.map(p => (
              <ProjectCard key={p._id} project={p} onUpdate={fetchProjects} />
            ))
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Project">
        <ProjectForm onSave={() => { setShowForm(false); fetchProjects(); }} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
