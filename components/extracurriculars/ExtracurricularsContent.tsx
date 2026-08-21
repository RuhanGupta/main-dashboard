'use client';
import { useState } from 'react';
import { Plus, Star, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IProject } from '@/types';
import { ProjectCard } from './ProjectCard';
import { ProjectForm } from './ProjectForm';
import { Modal } from '@/components/ui/modal';
import { WeeklyTaskList } from './WeeklyTaskList';
import { addDays, subDays, startOfDay, endOfDay } from 'date-fns';

export function ExtracurricularsContent({
  initialProjects = [],
}: {
  initialProjects?: IProject[];
}) {
  // Seeded from the server render — no initial fetch, no loading flash.
  const [projects, setProjects] = useState<IProject[]>(initialProjects);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekly' | 'all'>('weekly');

  // Refetch after mutations; the first render is already populated by the server.
  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    if (!res.ok) return;
    const data = await res.json();
    setProjects(Array.isArray(data) ? data : []);
  };

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
    <div className="p-8 max-w-5xl mx-auto stagger">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-extracurricular-soft border border-extracurricular-line rounded-2xl flex items-center justify-center shadow-card">
            <Star className="w-5 h-5 text-extracurricular-deep" />
          </div>
          <div>
            <h1 className="font-serif text-[1.75rem] font-semibold text-foreground tracking-tight">Extracurriculars</h1>
            <p className="text-sm text-muted-foreground">{projects.length} projects</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Project
        </Button>
      </div>

      {/* Tabs — segmented pill control */}
      <div className="inline-flex items-center gap-1 bg-muted/80 border border-border rounded-full p-1 mb-7">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
            activeTab === 'weekly' ? 'bg-card text-extracurricular-deep shadow-card' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="w-4 h-4" />
          This Week ({weeklyTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            activeTab === 'all' ? 'bg-card text-extracurricular-deep shadow-card' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Projects
        </button>
      </div>

      {activeTab === 'weekly' ? (
        <WeeklyTaskList tasks={weeklyTasks} onUpdate={fetchProjects} />
      ) : (
        <div className="space-y-4">
          {projects.length === 0 ? (
            <Card className="p-14 text-center">
              <Star className="w-12 h-12 text-border-strong mx-auto mb-3" />
              <p className="text-foreground font-serif font-medium text-lg">No projects yet</p>
              <p className="text-sm text-muted-foreground mt-1">Click "New Project" to add one</p>
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
