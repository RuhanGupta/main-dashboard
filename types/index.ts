export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Status = 'not_started' | 'in_progress' | 'completed' | 'cancelled';
export type Domain = 'academic' | 'extracurricular' | 'body' | 'reflection';

export interface ISubtask {
  _id?: string;
  title: string;
  description?: string;
  startDate?: Date | string;
  dueDate?: Date | string;
  priority: Priority;
  status: Status;
  notes?: string;
  googleTaskId?: string;
  completed: boolean;
  counselorVisible?: boolean;
}

export interface ITask {
  _id?: string;
  title: string;
  description?: string;
  domain: Domain;
  parentId?: string;
  parentType?: string;
  dueDate?: Date | string;
  priority: Priority;
  status: Status;
  notes?: string;
  subtasks: ISubtask[];
  googleTaskId?: string;
  counselorVisible?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ILink {
  title: string;
  url: string;
}

export interface IAssignment {
  _id?: string;
  userId?: string;
  title: string;
  course: string;
  startDate?: Date | string;
  dueDate?: Date | string;
  priority: Priority;
  status: Status;
  notes?: string;
  links: ILink[];
  subtasks: ISubtask[];
  googleTaskId?: string;
  counselorVisible?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IProject {
  _id?: string;
  userId?: string;
  title: string;
  description?: string;
  startDate?: Date | string;
  dueDate?: Date | string;
  priority: Priority;
  status: Status;
  notes?: string;
  links: ILink[];
  tasks: ITask[];
  googleTaskId?: string;
  counselorVisible?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IExercise {
  _id?: string;
  name: string;
  sets?: number;
  reps?: string;
  weight?: string;
  duration?: string;
  notes?: string;
  formTips?: string;
  previousWeights?: Array<{ date: string; weight: string; reps: string }>;
}

export interface IWorkout {
  _id?: string;
  userId?: string;
  title: string;
  date: Date | string;
  dayOfWeek?: number;
  exercises: IExercise[];
  notes?: string;
  completed: boolean;
}

export interface IHabit {
  _id?: string;
  userId?: string;
  name: string;
  frequency: 'daily' | 'weekly';
  color?: string;
  icon?: string;
  completions: Array<{ date: string; completed: boolean }>;
  streak: number;
  createdAt?: Date | string;
}

export interface IReflection {
  _id?: string;
  userId?: string;
  type: 'daily' | 'weekly' | 'monthly';
  date: Date | string;
  wins?: string;
  lessonsLearned?: string;
  thingsToImprove?: string;
  mood?: number;
  journalEntry?: string;
  createdAt?: Date | string;
}

export type DailyFocusSourceType = 'assignment_subtask' | 'project_task' | 'body_goal_subtask';

export interface IDailyFocusItem {
  _id: string;
  sourceType: DailyFocusSourceType;
  sourceId: string;
  parentId: string;
  title: string;
  parentTitle: string;
  completed: boolean;
  addedAt: string;
}

export interface IPomodoroSession {
  _id?: string;
  duration: number;
  startTime: Date | string;
  endTime?: Date | string;
  completed: boolean;
}
