'use client';
import { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Check, BookOpen, Star, Dumbbell, ChevronDown, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import type { IDailyFocusItem, DailyFocusSourceType } from '@/types';

interface PickerItem {
  sourceType: DailyFocusSourceType;
  sourceId: string;
  parentId: string;
  title: string;
  parentTitle: string;
  alreadyDone: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  existingItems: IDailyFocusItem[];
  onAdd: (item: Omit<IDailyFocusItem, '_id' | 'addedAt' | 'completed'>) => Promise<void>;
}

export function TaskPickerModal({ open, onClose, existingItems, onAdd }: Props) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [projects, setProjects]       = useState<any[]>([]);
  const [bodyGoals, setBodyGoals]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [query, setQuery]             = useState('');
  const [adding, setAdding]           = useState<Set<string>>(new Set());
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch('/api/assignments').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/body-goals').then(r => r.json()),
    ]).then(([a, p, b]) => {
      setAssignments(Array.isArray(a) ? a : []);
      setProjects(Array.isArray(p) ? p : []);
      setBodyGoals(Array.isArray(b) ? b : []);
    }).finally(() => setLoading(false));
  }, [open]);

  const addedIds = useMemo(() => new Set(existingItems.map(i => i.sourceId)), [existingItems]);

  const toggle = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handleAdd = async (item: PickerItem) => {
    if (addedIds.has(item.sourceId) || adding.has(item.sourceId)) return;
    setAdding(prev => new Set(prev).add(item.sourceId));
    await onAdd({ sourceType: item.sourceType, sourceId: item.sourceId, parentId: item.parentId, title: item.title, parentTitle: item.parentTitle });
    setAdding(prev => { const s = new Set(prev); s.delete(item.sourceId); return s; });
  };

  // Build all picker items from the loaded data
  const allItems: PickerItem[] = useMemo(() => {
    const items: PickerItem[] = [];
    assignments.forEach((a: any) => {
      (a.subtasks ?? []).forEach((s: any) => {
        items.push({ sourceType: 'assignment_subtask', sourceId: String(s._id), parentId: String(a._id), title: s.title, parentTitle: a.title, alreadyDone: s.completed });
      });
    });
    projects.forEach((p: any) => {
      (p.tasks ?? []).forEach((t: any) => {
        items.push({ sourceType: 'project_task', sourceId: String(t._id), parentId: String(p._id), title: t.title, parentTitle: p.title, alreadyDone: t.status === 'completed' });
      });
    });
    bodyGoals.forEach((g: any) => {
      (g.subtasks ?? []).forEach((s: any) => {
        items.push({ sourceType: 'body_goal_subtask', sourceId: String(s._id), parentId: String(g._id), title: s.title, parentTitle: g.title, alreadyDone: s.completed });
      });
    });
    return items;
  }, [assignments, projects, bodyGoals]);

  const q = query.toLowerCase().trim();
  const filtered = q ? allItems.filter(i => i.title.toLowerCase().includes(q) || i.parentTitle.toLowerCase().includes(q)) : null;

  const renderItem = (item: PickerItem) => {
    const isAdded   = addedIds.has(item.sourceId);
    const isAdding  = adding.has(item.sourceId);
    return (
      <div key={item.sourceId} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${item.alreadyDone ? 'opacity-40' : 'hover:bg-gray-50'}`}>
        <span className={`text-sm flex-1 ${item.alreadyDone ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.title}</span>
        <button
          disabled={isAdded || isAdding || item.alreadyDone}
          onClick={() => handleAdd(item)}
          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isAdded ? 'bg-green-100 text-green-600' : item.alreadyDone ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
          }`}
          title={isAdded ? 'Already in focus' : item.alreadyDone ? 'Already completed' : 'Add to today'}
        >
          {isAdded ? <Check className="w-3.5 h-3.5" /> : isAdding ? <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  };

  const renderSection = (
    label: string,
    icon: React.ReactNode,
    parents: any[],
    getChildren: (p: any) => PickerItem[]
  ) => {
    const hasItems = parents.some(p => getChildren(p).length > 0);
    if (!hasItems) return null;
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-1 mb-2">
          {icon}
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        </div>
        {parents.map((p: any) => {
          const children = getChildren(p);
          if (children.length === 0) return null;
          const pid = String(p._id);
          const isOpen = expanded.has(pid);
          return (
            <div key={pid}>
              <button onClick={() => toggle(pid)} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-left">
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">{p.title}</span>
                <span className="text-xs text-gray-400">{children.filter(c => !addedIds.has(c.sourceId) && !c.alreadyDone).length} available</span>
              </button>
              {isOpen && <div className="ml-5 space-y-0.5">{children.map(renderItem)}</div>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Add to Today's Focus">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            autoFocus
            type="text"
            placeholder="Search tasks…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="overflow-y-auto max-h-[420px] space-y-5 pr-1">
          {loading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : filtered !== null ? (
            // Search results — flat list with parent name as subtitle
            filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No tasks match "{query}"</p>
            ) : (
              <div className="space-y-0.5">
                {filtered.map(item => (
                  <div key={item.sourceId} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${item.alreadyDone ? 'opacity-40' : 'hover:bg-gray-50'}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.alreadyDone ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.title}</p>
                      <p className="text-xs text-gray-400 truncate">{item.parentTitle}</p>
                    </div>
                    <button
                      disabled={addedIds.has(item.sourceId) || adding.has(item.sourceId) || item.alreadyDone}
                      onClick={() => handleAdd(item)}
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${addedIds.has(item.sourceId) ? 'bg-green-100 text-green-600' : item.alreadyDone ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                    >
                      {addedIds.has(item.sourceId) ? <Check className="w-3.5 h-3.5" /> : adding.has(item.sourceId) ? <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Grouped view
            <>
              {renderSection('Assignments', <BookOpen className="w-3.5 h-3.5 text-blue-500" />, assignments,
                (a) => (a.subtasks ?? []).map((s: any) => ({ sourceType: 'assignment_subtask' as const, sourceId: String(s._id), parentId: String(a._id), title: s.title, parentTitle: a.title, alreadyDone: s.completed }))
              )}
              {renderSection('Projects', <Star className="w-3.5 h-3.5 text-purple-500" />, projects,
                (p) => (p.tasks ?? []).map((t: any) => ({ sourceType: 'project_task' as const, sourceId: String(t._id), parentId: String(p._id), title: t.title, parentTitle: p.title, alreadyDone: t.status === 'completed' }))
              )}
              {renderSection('Body Goals', <Dumbbell className="w-3.5 h-3.5 text-green-500" />, bodyGoals,
                (g) => (g.subtasks ?? []).map((s: any) => ({ sourceType: 'body_goal_subtask' as const, sourceId: String(s._id), parentId: String(g._id), title: s.title, parentTitle: g.title, alreadyDone: s.completed }))
              )}
              {!loading && assignments.length === 0 && projects.length === 0 && bodyGoals.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No tasks found. Add assignments or projects first.</p>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
