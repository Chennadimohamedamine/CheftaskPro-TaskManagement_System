/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { axiosInstance } from '../../api/axios.js';
import { Project, Team, User, Task } from '../../types.js';
import { Button, Input, Modal, StatusBadge, EmptyState } from '../../components/common/UI.js';
import {
  Briefcase,
  Users,
  Code,
  AlertTriangle,
  Plus,
  ArrowRight,
  FolderPlus,
  UserPlus,
  Users2,
  Trash2,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

// --- Zod schemas for modals ---
const projectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'on_hold']),
  teamId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional()
});

const devSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email')
});

const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(50),
  developerIds: z.array(z.string()).min(1, 'Please select at least one developer')
});

type ProjectFormValues = z.infer<typeof projectSchema>;
type DevFormValues = z.infer<typeof devSchema>;
type TeamFormValues = z.infer<typeof teamSchema>;

export const ChefDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Modals Visibility
  const [activeModal, setActiveModal] = useState<'project' | 'developer' | 'team' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchChefData = async () => {
    try {
      setLoading(true);
      const [projsRes, teamsRes, devsRes, tasksRes] = await Promise.all([
        axiosInstance.get('/projects'),
        axiosInstance.get('/teams'),
        axiosInstance.get('/users'), // Scoped to creator chef under backend layer
        axiosInstance.get('/tasks')  // Scoped to chef projects under backend layer
      ]);

      if (projsRes.data.success) setProjects(projsRes.data.data);
      if (teamsRes.data.success) setTeams(teamsRes.data.data);
      if (devsRes.data.success) setDevelopers(devsRes.data.data);
      if (tasksRes.data.success) setTasks(tasksRes.data.data);
    } catch (err) {
      toast.error('Failed to load Chef de Projet resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChefData();
  }, []);

  // --- Forms Initialization ---
  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { title: '', description: '', status: 'todo', teamId: '', startDate: '', dueDate: '' }
  });

  const devForm = useForm<DevFormValues>({
    resolver: zodResolver(devSchema),
    defaultValues: { fullName: '', email: '' }
  });

  const teamForm = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: '', developerIds: [] }
  });

  // --- Form Handlers ---
  const onCreateProject = async (values: ProjectFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        teamId: values.teamId ? parseInt(values.teamId) : null
      };
      await axiosInstance.post('/projects', payload);
      toast.success('Project created successfully!');
      projectForm.reset();
      setActiveModal(null);
      fetchChefData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCreateDeveloper = async (values: DevFormValues) => {
    setIsSubmitting(true);
    try {
      await axiosInstance.post('/users/developer', values);
      toast.success('Developer account created. Invitation setup email dispatched!');
      devForm.reset();
      setActiveModal(null);
      fetchChefData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to onboard developer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCreateTeam = async (values: TeamFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: values.name,
        developerIds: values.developerIds.map((id) => parseInt(id))
      };
      await axiosInstance.post('/teams', payload);
      toast.success('Team created successfully. Leadership assigned to the first member.');
      teamForm.reset();
      setActiveModal(null);
      fetchChefData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Sub-deletions ---
  const handleDeleteTeam = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    try {
      await axiosInstance.delete(`/teams/${id}`);
      toast.success('Team deleted');
      fetchChefData();
    } catch (err) {
      toast.error('Failed to delete team');
    }
  };

  // Calculate project statistics and tasks done ratio
  const getProjectRatio = (projId: number) => {
    const projTasks = tasks.filter((t) => t.projectId === projId);
    if (projTasks.length === 0) return { done: 0, total: 0, percentage: 0 };
    const done = projTasks.filter((t) => t.status === 'done').length;
    return {
      done,
      total: projTasks.length,
      percentage: Math.round((done / projTasks.length) * 100)
    };
  };

  // Overdue tasks calculation
  const overdueCount = tasks.filter((t) => {
    if (t.status === 'done' || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight">Project Management Workspace</h1>
        <p className="font-sans text-xs text-slate-500 mt-1">Design pipelines, track teams, and verify deliverables</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white h-24 rounded-xl border border-slate-100 animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-white rounded-xl border border-slate-100 animate-pulse" />
        </div>
      ) : (
        <>
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="font-sans text-xs font-semibold text-slate-400 block uppercase tracking-wider">My Projects</span>
                <span className="font-display font-bold text-2xl text-slate-800">{projects.length}</span>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="font-sans text-xs font-semibold text-slate-400 block uppercase tracking-wider">My Teams</span>
                <span className="font-display font-bold text-2xl text-slate-800">{teams.length}</span>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="font-sans text-xs font-semibold text-slate-400 block uppercase tracking-wider">My Developers</span>
                <span className="font-display font-bold text-2xl text-slate-800">{developers.length}</span>
              </div>
              <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
                <Code className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="font-sans text-xs font-semibold text-slate-400 block uppercase tracking-wider">Overdue Tasks</span>
                <span className={`font-display font-bold text-2xl ${overdueCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{overdueCount}</span>
              </div>
              <div className={`p-3 rounded-lg ${overdueCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Quick Action Hub */}
          <div className="bg-slate-900 text-white rounded-xl shadow-md p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-sm tracking-tight">Direct Command Actions</h3>
              <p className="font-sans text-xs text-slate-400">Launch a new roadmap task, onboard staff, or define a new project container.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => setActiveModal('project')}
                className="bg-blue-600 hover:bg-blue-500 text-xs py-2 text-white font-medium"
              >
                <FolderPlus className="w-4 h-4 mr-1.5" />
                <span>+ New Project</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => setActiveModal('developer')}
                className="bg-teal-600 hover:bg-teal-500 text-xs py-2 text-white font-medium"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                <span>+ Onboard Developer</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => setActiveModal('team')}
                className="bg-indigo-600 hover:bg-indigo-500 text-xs py-2 text-white font-medium"
              >
                <Users2 className="w-4 h-4 mr-1.5" />
                <span>+ Create Team</span>
              </Button>
            </div>
          </div>

          {/* Core Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* My Projects Grid (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-slate-800 tracking-tight uppercase">My active pipelines</h3>
              </div>

              {projects.length === 0 ? (
                <EmptyState
                  title="No projects assigned yet"
                  description="Begin planning by building your first project roadmaps and attaching engineering groups."
                  ctaText="Onboard First Project"
                  onCtaClick={() => setActiveModal('project')}
                  icon={<Briefcase className="w-10 h-10" />}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projects.map((proj) => {
                    const ratio = getProjectRatio(proj.id);
                    return (
                      <div key={proj.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-colors duration-200">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-display font-bold text-slate-800 text-sm truncate max-w-[180px]">{proj.title}</h4>
                            <StatusBadge status={proj.status} />
                          </div>
                          <p className="font-sans text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {proj.description || 'No descriptive summary specified.'}
                          </p>
                        </div>

                        <div className="mt-5 space-y-3 pt-3 border-t border-slate-50">
                          {/* Progress bar */}
                          <div>
                            <div className="flex justify-between items-center text-[10px] font-medium mb-1 font-mono">
                              <span className="text-slate-400">Roadmap Progress</span>
                              <span className="text-blue-600">{ratio.done}/{ratio.total} Tasks ({ratio.percentage}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${ratio.percentage}%` }}></div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] text-slate-400 flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              {proj.dueDate ? new Date(proj.dueDate).toLocaleDateString() : 'No limit'}
                            </span>
                            <Link to={`/chef/projects/${proj.id}`} className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                              <span>Kanban Roadmap</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* My Teams panel (1/3 width) */}
            <div className="space-y-4">
              <h3 className="font-display font-bold text-sm text-slate-800 tracking-tight uppercase">Operational Teams</h3>

              {teams.length === 0 ? (
                <div className="bg-white p-6 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  No active teams. Build your first group to delegate project containers.
                </div>
              ) : (
                <div className="space-y-3.5 font-sans">
                  {teams.map((t) => (
                    <div key={t.id} className="bg-white p-4.5 rounded-xl border border-slate-100 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-2.5 mb-2.5">
                        <h4 className="font-display font-bold text-slate-800 text-xs tracking-tight">{t.name}</h4>
                        <button
                          onClick={() => handleDeleteTeam(t.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[10px] text-slate-500 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-400">Team Leader:</span>
                          <span className="font-bold text-blue-600">{t.leader?.fullName || 'None'}</span>
                        </div>
                        <div className="flex flex-col gap-1 mt-2.5">
                          <span className="font-semibold text-slate-400 block mb-1">Members ({t.developers.length}):</span>
                          <div className="flex flex-wrap gap-1">
                            {t.developers.map((dev) => (
                              <span key={dev.id} className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded text-[10px] border border-slate-100">
                                {dev.fullName}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* --- MODALS --- */}

      {/* 1. New Project Modal */}
      <Modal isOpen={activeModal === 'project'} onClose={() => setActiveModal(null)} title="Onboard New Project Container">
        <form onSubmit={projectForm.handleSubmit(onCreateProject)} className="space-y-4 font-sans">
          <Input id="title" label="Project Title" placeholder="E-Commerce API Integration" error={projectForm.formState.errors.title?.message} {...projectForm.register('title')} />
          
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Project Description</label>
            <textarea
              className="border border-slate-200 rounded-lg text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Provide a short synopsis of core milestones..."
              rows={3}
              {...projectForm.register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input id="startDate" label="Start Date" type="date" {...projectForm.register('startDate')} />
            <Input id="dueDate" label="Target Due Date" type="date" {...projectForm.register('dueDate')} />
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 font-sans">Assign Working Team</label>
            <select className="border border-slate-200 bg-white rounded-lg text-sm px-3 py-2.5" {...projectForm.register('teamId')}>
              <option value="">-- No Team Assigned --</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id.toString()}>{t.name}</option>
              ))}
            </select>
          </div>

          <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>Create Project Container</Button>
        </form>
      </Modal>

      {/* 2. Onboard Developer Modal */}
      <Modal isOpen={activeModal === 'developer'} onClose={() => setActiveModal(null)} title="Onboard Developer Profile">
        <form onSubmit={devForm.handleSubmit(onCreateDeveloper)} className="space-y-4 font-sans">
          <Input id="fullName" label="Developer Full Name" placeholder="Alex Rivera" error={devForm.formState.errors.fullName?.message} {...devForm.register('fullName')} />
          <Input id="email" label="Developer Email Address" type="email" placeholder="alex.rivera@company.com" error={devForm.formState.errors.email?.message} {...devForm.register('email')} />

          <div className="bg-slate-50 border rounded-lg p-3 text-[10px] text-slate-500 leading-normal">
            <strong>Security Notice:</strong> The developer will be sent an automated secure setup email containing an expiring link to configure their permanent credentials.
          </div>

          <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>Dispatch Onboarding Link</Button>
        </form>
      </Modal>

      {/* 3. Create Team Modal */}
      <Modal isOpen={activeModal === 'team'} onClose={() => setActiveModal(null)} title="Create Collaboration Team">
        <form onSubmit={teamForm.handleSubmit(onCreateTeam)} className="space-y-4 font-sans">
          <Input id="name" label="Team Name" placeholder="Backend Squad" error={teamForm.formState.errors.name?.message} {...teamForm.register('name')} />

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 block mb-1">Select Members (Developer belongs to 1 team max)</label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
              {developers.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">No developers onboarded. Please onboard developers first.</div>
              ) : (
                developers.map((dev) => (
                  <label key={dev.id} className="flex items-center space-x-2.5 text-xs text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      value={dev.id.toString()}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      {...teamForm.register('developerIds')}
                    />
                    <span>{dev.fullName} {dev.team ? `(Currently: ${dev.team.name})` : ''}</span>
                  </label>
                ))
              )}
            </div>
            {teamForm.formState.errors.developerIds && (
              <span className="text-red-500 text-xs font-semibold mt-1">{teamForm.formState.errors.developerIds.message}</span>
            )}
          </div>

          <Button type="submit" className="w-full mt-2 animate-fade-in" isLoading={isSubmitting}>Establish Team Group</Button>
        </form>
      </Modal>
    </div>
  );
};
