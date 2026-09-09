import type { Experiment } from '../types/experiment';

const STORAGE_KEY = 'hackathon-tasks';

interface TaskStore {
  tasks: Experiment[];
  dateKey: string;
  updatedAt: string;
}

function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadRaw(): TaskStore | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TaskStore;
  } catch {
    return null;
  }
}

function saveRaw(store: TaskStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...store, updatedAt: new Date().toISOString() }));
}

export function todayTasks(): Experiment[] {
  const store = loadRaw();
  const today = localDateKey();
  if (!store || store.dateKey !== today) {
    const fresh: TaskStore = { tasks: [], dateKey: today, updatedAt: new Date().toISOString() };
    saveRaw(fresh);
    return fresh.tasks;
  }
  return store.tasks;
}

export function saveTodayTasks(tasks: Experiment[]) {
  saveRaw({ tasks, dateKey: localDateKey(), updatedAt: new Date().toISOString() });
}

export function addTask(name: string, minutes = 15): Experiment {
  const tasks = todayTasks();
  const task: Experiment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    icon: 'flask',
    minutes,
    completed: false,
  };
  tasks.push(task);
  saveTodayTasks(tasks);
  emitTaskChange();
  return task;
}

export function toggleTask(id: string) {
  const tasks = todayTasks().map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
  saveTodayTasks(tasks);
  emitTaskChange();
}

export function removeTask(id: string) {
  const tasks = todayTasks().filter((t) => t.id !== id);
  saveTodayTasks(tasks);
  emitTaskChange();
}

type TaskChangeListener = () => void;
const listeners = new Set<TaskChangeListener>();

export function onTaskChange(listener: TaskChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitTaskChange() {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* ignore */ }
  });
}
