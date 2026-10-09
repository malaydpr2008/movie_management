export interface Project {
  id: string;
  title: string;
  slug: string;
  status: string;
  aspect_ratio: string;
  target_runtime_minutes: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface BackgroundJob {
  id: string;
  task_name: string;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  result?: any;
  error_message?: string;
  created_at: string;
}

export interface ProjectMembership {
  id: string;
  user_id: string;
  project_id: string;
  role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
}
