import { useCallback, useState } from 'react';
import type { Experiment, ExperimentSeed } from '../types/experiment';
import { addToday, loadToday, removeToday, toggleToday } from '../utils/tasks';

/** 今日任务状态与操作的统一入口；界面只通过它读写数据层。 */
export function useTasks() {
  const [tasks, setTasks] = useState<Experiment[]>(() => loadToday());
  const add = useCallback((template: Omit<ExperimentSeed, 'id'>) => {
    setTasks(addToday(template));
  }, []);
  const toggle = useCallback((id: string) => {
    setTasks(toggleToday(id));
  }, []);
  const remove = useCallback((id: string) => {
    setTasks(removeToday(id));
  }, []);
  return { tasks, add, toggle, remove };
}
