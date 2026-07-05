/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { axiosInstance } from '../../api/axios.js';
import { Project, Team, Task, Comment, User } from '../../types.js';
import { Button, Input, Modal, StatusBadge } from '../../components/common/UI.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  ArrowLeft,
  Plus,
  Calendar,
  MessageSquare,
  AlertCircle,
  Clock,
  Trash2,
  Check,
  UserCheck,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';

// Task validation schema
const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  priority: z.enum(['low', 'medium', 'high']),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional()
});

type TaskFormValues = z.infer<typeof taskSchema>;

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Drag Hover active highlights
  const [dragHoveredCol, setDragHoveredCol] = useState<'todo' | 'in_progress' | 'done' | null>(null);

  // Active task details for Comment panel modal
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const projRes = await axiosInstance.get(`/projects/${id}`);
      if (projRes.data.success) {
        const projData = projRes.data.data;
        setProject(projData);

        // Fetch team members if project has a team
        if (projData.teamId) {
          const teamRes = await axiosInstance.get(`/teams/${projData.teamId}`);
          if (teamRes.data.success) {
            setTeam(teamRes.data.data);
          }
        }

        // Fetch project tasks
        const tasksRes = await axiosInstance.get(`/tasks?projectId=${id}`);
        if (tasksRes.data.success) {
          setTasks(tasksRes.data.data);
        }
      }
    } catch (err) {
      toast.error('Failed to load project pipeline data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  // Form setup
  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', description: '', priority: 'medium', assigneeId: '', dueDate: '' }
  });

  const handleUpdateProjectStatus = async (status: string) => {
    if (!project) return;
    try {
      await axiosInstance.put(`/projects/${project.id}/status`, { status });
      setProject({ ...project, status: status as any });
      toast.success('Project status updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project status');
    }
  };

  const handleCreateTask = async (values: TaskFormValues) => {
    if (!project) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        projectId: project.id,
        assigneeId: values.assigneeId ? parseInt(values.assigneeId) : null
      };
      await axiosInstance.post('/tasks', payload);
      toast.success('Task created successfully');
      taskForm.reset();
      setShowTaskModal(false);
      fetchProjectDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!window.confirm('Delete this task? This action is irreversible.')) return;
    try {
      await axiosInstance.delete(`/tasks/${taskId}`);
      toast.success('Task deleted successfully');
      setTasks(tasks.filter((t) => t.id !== taskId));
      if (activeTask?.id === taskId) setActiveTask(null);
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  // --- HTML5 Native Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('text/plain', taskId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, col: 'todo' | 'in_progress' | 'done') => {
    e.preventDefault();
    setDragHoveredCol(col);
  };

  const handleDragLeave = () => {
    setDragHoveredCol(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: 'todo' | 'in_progress' | 'done') => {
    e.preventDefault();
    setDragHoveredCol(null);
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;

    const taskId = parseInt(taskIdStr);
    const originalTasks = [...tasks];

    // Optimistically update status locally for maximum responsiveness
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await axiosInstance.put(`/tasks/${taskId}/status`, { status: newStatus });
      toast.success(`Task shifted to ${newStatus.replace('_', ' ')}`);
    } catch (err) {
      // Revert if API fails
      setTasks(originalTasks);
      toast.error('Failed to persist task column update');
    }
  };

  // --- Active Task detail & Comments Panel ---
  const handleOpenTaskDetail = async (task: Task) => {
    setActiveTask(task);
    try {
      const res = await axiosInstance.get(`/tasks/${task.id}/comments`);
      if (res.data.success) {
        setComments(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch comments');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeTask) return;

    setIsPostingComment(true);
    try {
      const res = await axiosInstance.post(`/tasks/${activeTask.id}/comments`, { content: commentText });
      if (res.data.success) {
        setComments((prev) => [res.data.data, ...prev]);
        setCommentText('');
        toast.success('Comment logged');
      }
    } catch (err) {
      toast.error('Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) return <div className="p-6 text-center text-slate-500">Project not found or unauthorized.</div>;

  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const progressTasks = tasks.filter((t) => t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back navigation */}
      <div>
        <Link to="/" className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-3 gap-1 cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to workspace</span>
        </Link>
        
        {/* Project Header card */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="font-display font-bold text-xl text-slate-900 tracking-tight">{project.title}</h2>
              <StatusBadge status={project.status} />
            </div>
            <p className="font-sans text-xs text-slate-500 leading-relaxed max-w-2xl">{project.description || 'No project description listed.'}</p>
            
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-sans mt-3">
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'Unspecified'}
              </span>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold text-[10px]">
                Group: {team?.name || 'No Team Assigned'}
              </span>
            </div>
          </div>

          {/* Quick status modifier for project itself */}
          {user?.role === 'chef_projet' && (
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Pipeline State</label>
              <select
                className="border border-slate-200 bg-white rounded-lg text-xs font-medium px-3.5 py-2 cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                value={project.status}
                onChange={(e) => handleUpdateProjectStatus(e.target.value)}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="done">Completed</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board header tools */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm tracking-tight text-slate-800 uppercase">Interactive Kanban Board</h3>
        {user?.role === 'chef_projet' && (
          <Button onClick={() => setShowTaskModal(true)} className="text-xs py-2 px-3.5 bg-blue-600 hover:bg-blue-500">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Create Task</span>
          </Button>
        )}
      </div>

      {/* 3 Columns Kanban Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* COLUMN 1: TO DO */}
        <div
          onDragOver={(e) => handleDragOver(e, 'todo')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'todo')}
          className={`bg-slate-50/70 p-4.5 rounded-xl border border-dashed transition-all ${dragHoveredCol === 'todo' ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200'}`}
        >
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2 bg-slate-50/20">
            <span className="font-display font-bold text-xs text-slate-700 tracking-tight uppercase flex items-center">
              <span className="w-2 h-2 rounded-full bg-slate-400 mr-2 block"></span>
              To Do
            </span>
            <span className="font-mono text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{todoTasks.length}</span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {todoTasks.map((t) => (
              <KanbanTaskCard key={t.id} task={t} onOpenDetails={handleOpenTaskDetail} onDelete={handleDeleteTask} dragStart={handleDragStart} role={user?.role} />
            ))}
            {todoTasks.length === 0 && (
              <div className="py-12 text-center text-[11px] text-slate-400">Empty column. Drop task here.</div>
            )}
          </div>
        </div>

        {/* COLUMN 2: IN PROGRESS */}
        <div
          onDragOver={(e) => handleDragOver(e, 'in_progress')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'in_progress')}
          className={`bg-slate-50/70 p-4.5 rounded-xl border border-dashed transition-all ${dragHoveredCol === 'in_progress' ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200'}`}
        >
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2 bg-slate-50/20">
            <span className="font-display font-bold text-xs text-blue-700 tracking-tight uppercase flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 block"></span>
              In Progress
            </span>
            <span className="font-mono text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{progressTasks.length}</span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {progressTasks.map((t) => (
              <KanbanTaskCard key={t.id} task={t} onOpenDetails={handleOpenTaskDetail} onDelete={handleDeleteTask} dragStart={handleDragStart} role={user?.role} />
            ))}
            {progressTasks.length === 0 && (
              <div className="py-12 text-center text-[11px] text-slate-400">Empty column. Drop task here.</div>
            )}
          </div>
        </div>

        {/* COLUMN 3: COMPLETED */}
        <div
          onDragOver={(e) => handleDragOver(e, 'done')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'done')}
          className={`bg-slate-50/70 p-4.5 rounded-xl border border-dashed transition-all ${dragHoveredCol === 'done' ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200'}`}
        >
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2 bg-slate-50/20">
            <span className="font-display font-bold text-xs text-green-700 tracking-tight uppercase flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 block"></span>
              Completed
            </span>
            <span className="font-mono text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{doneTasks.length}</span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {doneTasks.map((t) => (
              <KanbanTaskCard key={t.id} task={t} onOpenDetails={handleOpenTaskDetail} onDelete={handleDeleteTask} dragStart={handleDragStart} role={user?.role} />
            ))}
            {doneTasks.length === 0 && (
              <div className="py-12 text-center text-[11px] text-slate-400">Empty column. Drop task here.</div>
            )}
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Add Task Modal */}
      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title="Create New Roadmap Task">
        <form onSubmit={taskForm.handleSubmit(handleCreateTask)} className="space-y-4 font-sans">
          <Input id="title" label="Task Title" placeholder="Develop user authentication routers" error={taskForm.formState.errors.title?.message} {...taskForm.register('title')} />
          
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Task Details</label>
            <textarea
              className="border border-slate-200 rounded-lg text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Specify requirements, scope, or expected outputs..."
              rows={3}
              {...taskForm.register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Priority Level</label>
              <select className="border border-slate-200 bg-white rounded-lg text-sm px-3 py-2.5" {...taskForm.register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <Input id="dueDate" label="Target Due Date" type="date" {...taskForm.register('dueDate')} />
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Assign Member</label>
            <select className="border border-slate-200 bg-white rounded-lg text-sm px-3 py-2.5" {...taskForm.register('assigneeId')}>
              <option value="">-- Unassigned --</option>
              {team?.developers.map((dev) => (
                <option key={dev.id} value={dev.id.toString()}>{dev.fullName} ({dev.email})</option>
              ))}
            </select>
          </div>

          <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>Onboard Roadmap Task</Button>
        </form>
      </Modal>

      {/* 2. Task Details and Comments Modal */}
      <Modal isOpen={!!activeTask} onClose={() => setActiveTask(null)} title={activeTask?.title || 'Task Details'}>
        {activeTask && (
          <div className="space-y-6 font-sans">
            {/* Task Info Specs */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4.5 grid grid-cols-2 gap-3.5 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-400">Priority:</span>
                <StatusBadge status={activeTask.priority} />
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-400">Due:</span>
                <span className="font-mono">{activeTask.dueDate ? new Date(activeTask.dueDate).toLocaleDateString() : 'None'}</span>
              </div>

              <div className="flex items-center space-x-2 col-span-2">
                <UserCheck className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-400">Assignee:</span>
                <span className="font-bold text-slate-800">{activeTask.assignee?.fullName || 'Unassigned'}</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Task Scope</h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/30 p-3 rounded-lg border border-slate-100">
                {activeTask.description || 'No detailed scope or criteria specified for this milestone.'}
              </p>
            </div>

            {/* Comments logs section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                <span>Task Comments logs ({comments.length})</span>
              </h4>

              {/* Form */}
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Post an update, comment, or criteria checklist..."
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <Button type="submit" className="py-2 px-3 text-xs" isLoading={isPostingComment}>Comment</Button>
              </form>

              {/* List */}
              <div className="max-h-52 overflow-y-auto space-y-3 pr-1">
                {comments.map((com) => (
                  <div key={com.id} className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-xs flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-1.5 text-[10px]">
                      <span className="font-bold text-slate-800">{com.user?.fullName || 'Member'} <span className="text-[9px] uppercase font-mono tracking-wider font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-1">{com.user?.role?.replace('_', ' ')}</span></span>
                      <span className="text-slate-400 font-mono flex items-center"><Clock className="w-3 h-3 mr-0.5" /> {new Date(com.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-sans">{com.content}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs">No comments posted yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// --- SUB TASK CARD COMPONENT ---
interface KanbanTaskCardProps {
  task: Task;
  onOpenDetails: (task: Task) => void;
  onDelete: (id: number) => void;
  dragStart: (e: React.DragEvent, id: number) => void;
  role?: string;
}

const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({ task, onOpenDetails, onDelete, dragStart, role }) => {
  const isOverdue = task.status !== 'done' && task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      draggable
      onDragStart={(e) => dragStart(e, task.id)}
      className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-xs hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing border-l-4 border-l-blue-500 relative group animate-fade-in"
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <h4 className="font-sans font-bold text-xs text-slate-800 tracking-tight leading-normal line-clamp-1 group-hover:text-blue-600 transition-colors" onClick={() => onOpenDetails(task)}>
          {task.title}
        </h4>
        {role === 'chef_projet' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <p className="font-sans text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-4">
        {task.description || 'No descriptive criteria listed.'}
      </p>

      {/* Card footer */}
      <div className="flex items-center justify-between pt-3.5 border-t border-slate-50 text-[10px] text-slate-400 font-sans">
        <div className="flex items-center space-x-1.5">
          <StatusBadge status={task.priority} />
          {isOverdue && (
            <span className="bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded text-[9px] flex items-center">
              <AlertCircle className="w-3 h-3 mr-0.5" /> Overdue
            </span>
          )}
        </div>

        <button
          onClick={() => onOpenDetails(task)}
          className="font-semibold text-blue-600 hover:text-blue-800 flex items-center shrink-0"
        >
          <span>Comments</span>
        </button>
      </div>

      {/* Assignee indicator if active */}
      {task.assignee && (
        <div className="mt-2 text-[9px] font-mono font-medium text-slate-500 flex items-center justify-end">
          <span className="bg-slate-50 border px-1.5 py-0.5 rounded">@{task.assignee.fullName.toLowerCase().replace(/\s+/g, '')}</span>
        </div>
      )}
    </div>
  );
};
