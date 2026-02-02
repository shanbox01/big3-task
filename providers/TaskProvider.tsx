import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Task } from '@/types/task';

const STORAGE_KEY = 'bitetask_tasks';

async function loadTasksFromStorage(): Promise<Task[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('[TaskProvider] Loaded tasks from storage:', parsed.length);
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('[TaskProvider] Error loading tasks:', error);
    return [];
  }
}

async function saveTasksToStorage(tasks: Task[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    console.log('[TaskProvider] Saved tasks to storage:', tasks.length);
  } catch (error) {
    console.error('[TaskProvider] Error saving tasks:', error);
  }
}

export const [TaskProvider, useTasks] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [tasks, setTasksState] = useState<Task[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: loadTasksFromStorage,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (tasksQuery.data && !isInitialized) {
      setTasksState(tasksQuery.data);
      setIsInitialized(true);
      console.log('[TaskProvider] Initialized with', tasksQuery.data.length, 'tasks');
    }
  }, [tasksQuery.data, isInitialized]);

  const saveMutation = useMutation({
    mutationFn: saveTasksToStorage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const { mutate: saveTasks } = saveMutation;

  const setTasks = useCallback((updater: Task[] | ((prev: Task[]) => Task[])) => {
    setTasksState(prev => {
      const newTasks = typeof updater === 'function' ? updater(prev) : updater;
      saveTasks(newTasks);
      return newTasks;
    });
  }, [saveTasks]);

  const addTasks = useCallback((newTasks: Task[]) => {
    setTasks(prev => [...prev, ...newTasks]);
  }, [setTasks]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    ));
  }, [setTasks]);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, [setTasks]);

  const completeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: 'completed' as const, completedAt: Date.now() } 
        : t
    ));
  }, [setTasks]);

  const demoteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'bottom' as const } : t
    ));
  }, [setTasks]);

  const promoteTask = useCallback((taskId: string) => {
    setTasks(prev => {
      const currentTop3Count = prev.filter(t => t.status === 'top3').length;
      if (currentTop3Count >= 3) return prev;
      return prev.map(t => 
        t.id === taskId ? { ...t, status: 'top3' as const } : t
      );
    });
  }, [setTasks]);

  const swapTasks = useCallback((topTaskId: string, bottomTaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === topTaskId) return { ...t, status: 'bottom' as const };
      if (t.id === bottomTaskId) return { ...t, status: 'top3' as const };
      return t;
    }));
  }, [setTasks]);

  const addNextTasks = useCallback((count: number = 3) => {
    setTasks(prev => {
      const currentTop3Count = prev.filter(t => t.status === 'top3').length;
      const slotsAvailable = 3 - currentTop3Count;
      const bottomTasks = prev.filter(t => t.status === 'bottom');
      const tasksToPromote = bottomTasks.slice(0, Math.min(slotsAvailable, count)).map(t => t.id);
      return prev.map(t => 
        tasksToPromote.includes(t.id) ? { ...t, status: 'top3' as const } : t
      );
    });
  }, [setTasks]);

  const clearCompleted = useCallback(() => {
    setTasks(prev => prev.filter(t => t.status !== 'completed'));
  }, [setTasks]);

  const topTasks = useMemo(() => 
    tasks.filter(t => t.status === 'top3'), 
    [tasks]
  );

  const bottomTasks = useMemo(() => 
    tasks.filter(t => t.status === 'bottom'), 
    [tasks]
  );

  const completedTasks = useMemo(() => 
    tasks
      .filter(t => t.status === 'completed')
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)), 
    [tasks]
  );

  const totalMinutes = useMemo(() => 
    topTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0), 
    [topTasks]
  );

  return {
    tasks,
    setTasks,
    addTasks,
    updateTask,
    deleteTask,
    completeTask,
    demoteTask,
    promoteTask,
    swapTasks,
    addNextTasks,
    clearCompleted,
    topTasks,
    bottomTasks,
    completedTasks,
    totalMinutes,
    isLoading: tasksQuery.isLoading,
    isInitialized,
  };
});
