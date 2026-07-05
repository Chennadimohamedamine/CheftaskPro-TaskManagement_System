 export enum Role {
  ADMIN = 'admin',
  CHEF_PROJET = 'chef_projet',
  DEVELOPER = 'developer'
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: 'admin' | 'chef_projet' | 'developer';
  isActive: boolean;
  isEmailVerified: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  team?: { id: number; name: string } | null;
  creatorEmail?: string | null;
}

export interface Team {
  id: number;
  name: string;
  chefId: number;
  leader: { id: number; fullName: string; email: string } | null;
  createdAt: string;
  developers: { id: number; fullName: string; email: string; isActive: boolean }[];
}

export interface Project {
  id: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'on_hold';
  chefId: number;
  teamId: number | null;
  teamName: string | null;
  startDate: string | null;
  dueDate: string | null;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  projectId: number;
  projectName: string;
  assigneeId: number | null;
  assignee: { id: number; fullName: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  taskId: number;
  userId: number;
  content: string;
  createdAt: string;
  user: { id: number; fullName: string; email: string; role: string } | null;
}

export interface Notification {
  id: number;
  userId: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  actorId: number | null;
  action: string;
  targetType: string | null;
  targetId: number | null;
  metadata: string | null;
  createdAt: string;
}
