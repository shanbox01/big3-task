export interface Task {
  id: string;
  text: string;
  estimatedMinutes: number;
  goal: string;
  rule: string;
  doThis: string;
  priority: number;
  status: 'top3' | 'bottom' | 'completed';
  createdAt: number;
  completedAt?: number;
}

export interface ProcessedTasksResponse {
  tasks: {
    text: string;
    estimatedMinutes: number;
    goal: string;
    rule: string;
    doThis: string;
    priority: number;
  }[];
}
