/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { axiosInstance } from '../../api/axios.js';
import { Task, Comment } from '../../types.js';
import { StatusBadge, Modal, Button } from '../../components/common/UI.js';
import {
  CheckSquare,
  MessageSquare,
  Clock,
  Calendar,
  AlertCircle,
  Tag,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export const DeveloperDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dragHoveredCol, setDragHoveredCol] = useState<'todo' | 'in_progress' | 'done' | null>(null);

  // Comments/Detail state
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const fetchDeveloperTasks = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/tasks');
      if (res.data.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to retrieve your task loads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeveloperTasks();
  }, []);

  // HTML5 Drag Event Handlers
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

    // Optimistically update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await axiosInstance.put(`/tasks/${taskId}/status`, { status: newStatus });
      toast.success(`Task state updated to ${newStatus}`);
    } catch (err) {
      setTasks(originalTasks);
      toast.error('Failed to persist task column transition');
    }
  };

  const handleOpenTaskDetail = async (task: Task) => {
    setActiveTask(task);
    try {
      const res = await axiosInstance.get(`/tasks/${task.id}/comments`);
      if (res.data.success) {
        setComments(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load comments');
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
      toast.error('Failed to submit comment');
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

  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const progressTasks = tasks.filter((t) => t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-blue-600" />
          <span>My Developer Workspace</span>
        </h1>
        <p className="font-sans text-xs text-slate-500 mt-1">Manage and update progress on your assigned tickets</p>
      </div>

      {/* 3 Columns Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* COLUMN 1: TO DO */}
        <div
          onDragOver={(e) => handleDragOver(e, 'todo')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'todo')}
          className={`bg-slate-50/70 p-4.5 rounded-xl border border-dashed transition-all ${dragHoveredCol === 'todo' ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200'}`}
        >
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
            <span className="font-display font-bold text-xs text-slate-700 tracking-tight uppercase flex items-center">
              <span className="w-2 h-2 rounded-full bg-slate-400 mr-2 block"></span>
              To Do
            </span>
            <span className="font-mono text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{todoTasks.length}</span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {todoTasks.map((t) => (
              <DevTaskCard key={t.id} task={t} onOpen={handleOpenTaskDetail} onDragStart={handleDragStart} />
            ))}
            {todoTasks.length === 0 && (
              <div className="py-12 text-center text-[11px] text-slate-400">All caught up here!</div>
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
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
            <span className="font-display font-bold text-xs text-blue-700 tracking-tight uppercase flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 block"></span>
              In Progress
            </span>
            <span className="font-mono text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{progressTasks.length}</span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {progressTasks.map((t) => (
              <DevTaskCard key={t.id} task={t} onOpen={handleOpenTaskDetail} onDragStart={handleDragStart} />
            ))}
            {progressTasks.length === 0 && (
              <div className="py-12 text-center text-[11px] text-slate-400">Drag items here to mark active effort.</div>
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
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
            <span className="font-display font-bold text-xs text-green-700 tracking-tight uppercase flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 block"></span>
              Completed
            </span>
            <span className="font-mono text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{doneTasks.length}</span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {doneTasks.map((t) => (
              <DevTaskCard key={t.id} task={t} onOpen={handleOpenTaskDetail} onDragStart={handleDragStart} />
            ))}
            {doneTasks.length === 0 && (
              <div className="py-12 text-center text-[11px] text-slate-400">No completed items. Drag tickets here to deliver.</div>
            )}
          </div>
        </div>
      </div>

      {/* Details and Comments Modal */}
      <Modal isOpen={!!activeTask} onClose={() => setActiveTask(null)} title={activeTask?.title || 'Task Details'}>
        {activeTask && (
          <div className="space-y-6 font-sans">
            {/* Project Title mapping */}
            <div className="text-[11px] font-semibold text-slate-400 font-sans">
              PROJECT: <span className="text-slate-700 font-bold">{activeTask.projectName}</span>
            </div>

            {/* Task Info Specs */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4.5 grid grid-cols-2 gap-3.5 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-400">Priority:</span>
                <StatusBadge status={activeTask.priority} />
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-400">Due Date:</span>
                <span className="font-mono">{activeTask.dueDate ? new Date(activeTask.dueDate).toLocaleDateString() : 'None'}</span>
              </div>
            </div>

            {/* Scope */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/30 p-3 rounded-lg border border-slate-100">
                {activeTask.description || 'No detailed scope requirements listed for this task.'}
              </p>
            </div>

            {/* Comments Thread */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                <span>Discussion Thread ({comments.length})</span>
              </h4>

              {/* Add Comment */}
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask for clarification or report updates..."
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <Button type="submit" className="py-2 px-3 text-xs" isLoading={isPostingComment}>Send</Button>
              </form>

              {/* Thread list */}
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
                  <div className="text-center py-6 text-slate-400 text-xs">No entries posted. Be the first to start a thread!</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// --- LIGHTWEIGHT DEV TASK CARD ---
interface DevTaskCardProps {
  task: Task;
  onOpen: (task: Task) => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
}

const DevTaskCard: React.FC<DevTaskCardProps> = ({ task, onOpen, onDragStart }) => {
  const isOverdue = task.status !== 'done' && task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onOpen(task)}
      className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing border-l-4 border-l-blue-500 group animate-fade-in"
    >
      <div className="text-[10px] font-bold text-slate-400 mb-1 font-sans tracking-wide uppercase truncate max-w-[200px]">
        {task.projectName}
      </div>
      <h4 className="font-sans font-bold text-xs text-slate-800 leading-normal mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
        {task.title}
      </h4>
      <p className="font-sans text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-4">
        {task.description || 'No details specified.'}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-[10px] text-slate-400 font-sans">
        <div className="flex items-center space-x-1.5">
          <StatusBadge status={task.priority} />
          {isOverdue && (
            <span className="bg-red-50 text-red-700 font-semibold px-1.5 py-0.5 rounded text-[9px] flex items-center shrink-0">
              <AlertCircle className="w-3 h-3 mr-0.5" /> Overdue
            </span>
          )}
        </div>

        <span className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center cursor-pointer shrink-0">
          Comments
        </span>
      </div>
    </div>
  );
};
