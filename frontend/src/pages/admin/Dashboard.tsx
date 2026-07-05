 

import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { axiosInstance } from '../../api/axios'; 
import { User, AuditLog, Project } from '../../types'; 
import { StatusBadge, Button, Skeleton } from '../../components/common/UI'; 
import {
  Users,
  Briefcase,
  History,
  Shield,
  Search,
  UserCheck,
  UserMinus,
  CheckSquare,
  Trash2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';

export const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, logsRes, projectsRes] = await Promise.all([
        axiosInstance.get('/stats'),
        axiosInstance.get('/users?limit=200'),
        axiosInstance.get('/audit-logs?limit=200'),
        axiosInstance.get('/projects?limit=200')
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (logsRes.data.success) setAuditLogs(logsRes.data.data);
      if (projectsRes.data.success) {
        setProjects(projectsRes.data.data || projectsRes.data.projects || []);
      }
    } catch (err) {
      toast.error('Failed to load Admin Dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleUserStatus = async (id: number) => {
    setSubmittingId(id);
    try {
      const res = await axiosInstance.put(`/users/${id}/status`);
      if (res.data.success) {
        toast.success(res.data.message);
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u))
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to modify account status');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this project? This action is irreversible.')) return;
    try {
      await axiosInstance.delete(`/projects/${id}`);
      toast.success('Project deleted successfully');
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const chefs = users.filter((u) => u.role === 'chef_projet');
  const developers = users.filter((u) => u.role === 'developer');

  // URL-based view resolution
  const activeView = path === '/admin/chefs' ? 'chefs'
                   : path === '/admin/developers' ? 'developers'
                   : path === '/admin/projects' ? 'projects'
                   : path === '/admin/audit-logs' ? 'audit-logs'
                   : 'overview';

  // Filters based on view & search input
  const filteredChefs = chefs.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDevs = developers.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
      (p.teamName && p.teamName.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.metadata && l.metadata.toLowerCase().includes(search.toLowerCase()))
  );

  // Charts data
  const COLORS = ['#94a3b8', '#3b82f6', '#10b981', '#f59e0b']; // todo, in_progress, done, on_hold
  const pieData = stats
    ? [
        { name: 'To Do', value: stats.projects?.todo || 0 },
        { name: 'In Progress', value: stats.projects?.in_progress || 0 },
        { name: 'Completed', value: stats.projects?.done || 0 },
        { name: 'On Hold', value: stats.projects?.on_hold || 0 }
      ].filter((d) => d.value > 0)
    : [];

  const taskBarData = stats
    ? [
        { name: 'To Do', tasks: stats.tasks?.todo || 0 },
        { name: 'In Progress', tasks: stats.tasks?.in_progress || 0 },
        { name: 'Completed', tasks: stats.tasks?.done || 0 }
      ]
    : [];

  const getBreadcrumb = () => {
    switch (activeView) {
      case 'chefs': return 'Chefs de Projet Registry';
      case 'developers': return 'Developers Registry';
      case 'projects': return 'Global Project Portfolio';
      case 'audit-logs': return 'Platform Audit Trail';
      default: return 'Overview';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title / Breadcrumbs Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <span>Admin Console</span>
          </h1>
          <p className="font-sans text-xs text-slate-500 mt-1">
            Platform Management &bull; <span className="text-blue-600 font-semibold">{getBreadcrumb()}</span>
          </p>
        </div>
        {activeView !== 'overview' && (
          <Link to="/" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-xs">
            <span>&larr; Back to Dashboard Overview</span>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm h-24 flex flex-col justify-between">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            ))}
          </div>
          <div className="bg-white h-72 rounded-xl border border-slate-100 animate-pulse" />
        </div>
      ) : (
        <>
          {/* ================= OVERVIEW VIEW ================= */}
          {activeView === 'overview' && (
            <>
              {/* Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/admin/chefs" className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-4 hover:border-indigo-300 transition-colors">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-sans text-xs font-semibold text-slate-400 block uppercase tracking-wider">Total Chefs</span>
                    <span className="font-display font-bold text-2xl text-slate-800">{stats?.users?.totalChefs || 0}</span>
                  </div>
                </Link>

                <Link to="/admin/developers" className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-4 hover:border-teal-300 transition-colors">
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-sans text-xs font-semibold text-slate-400 block uppercase tracking-wider">Total Developers</span>
                    <span className="font-display font-bold text-2xl text-slate-800">{stats?.users?.totalDevs || 0}</span>
                  </div>
                </Link>

                <Link to="/admin/projects" className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-4 hover:border-blue-300 transition-colors">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-sans text-xs font-semibold text-slate-400 block uppercase tracking-wider">Total Projects</span>
                    <span className="font-display font-bold text-2xl text-slate-800">{projects.length}</span>
                  </div>
                </Link>

                <Link to="/admin/audit-logs" className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-4 hover:border-green-300 transition-colors">
                  <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                    <CheckSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-sans text-xs font-semibold text-slate-400 block uppercase tracking-wider">Completed Tasks</span>
                    <span className="font-display font-bold text-2xl text-slate-800">{stats?.tasks?.done || 0}</span>
                  </div>
                </Link>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                  <h3 className="font-display font-semibold text-sm text-slate-800 mb-4 uppercase tracking-wider">Projects by Status</h3>
                  <div className="h-64">
                    {pieData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">No project metrics yet.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                  <h3 className="font-display font-semibold text-sm text-slate-800 mb-4 uppercase tracking-wider">Task Progress Loads</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={taskBarData}>
                        <XAxis dataKey="name" fontSize={11} stroke="#64748b" />
                        <YAxis fontSize={11} stroke="#64748b" />
                        <Tooltip />
                        <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Quick Previews Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chefs Preview */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                      <h4 className="font-display font-bold text-xs text-slate-700 uppercase tracking-wider">Chefs de Projet</h4>
                      <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{chefs.length}</span>
                    </div>
                    <div className="space-y-3">
                      {chefs.slice(0, 3).map((chef) => (
                        <div key={chef.id} className="flex justify-between items-center text-xs">
                          <div>
                            <p className="font-semibold text-slate-800">{chef.fullName}</p>
                            <p className="text-slate-400 font-mono text-[10px]">{chef.email}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${chef.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {chef.isActive ? 'Active' : 'Offline'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link to="/admin/chefs" className="mt-5 text-center text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 pt-3 border-t border-slate-50">
                    <span>Manage all registered Chefs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Developers Preview */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                      <h4 className="font-display font-bold text-xs text-slate-700 uppercase tracking-wider">Active Developers</h4>
                      <span className="font-mono text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold">{developers.length}</span>
                    </div>
                    <div className="space-y-3">
                      {developers.slice(0, 3).map((dev) => (
                        <div key={dev.id} className="flex justify-between items-center text-xs">
                          <div>
                            <p className="font-semibold text-slate-800">{dev.fullName}</p>
                            <p className="text-slate-400 font-mono text-[10px] truncate max-w-[150px]">{dev.email}</p>
                          </div>
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {dev.team?.name || 'Unassigned'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link to="/admin/developers" className="mt-5 text-center text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 pt-3 border-t border-slate-50">
                    <span>Manage developer profiles</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Audit Logs Preview */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                      <h4 className="font-display font-bold text-xs text-slate-700 uppercase tracking-wider">Recent Activity</h4>
                      <History className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="space-y-3.5">
                      {auditLogs.slice(0, 3).map((log) => (
                        <div key={log.id} className="text-xs space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[9px] bg-slate-100 px-1 py-0.2 rounded text-slate-600">{log.action}</span>
                            <span className="text-[9px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {log.metadata ? (log.metadata.startsWith('{') ? JSON.parse(log.metadata).email || JSON.parse(log.metadata).title || log.metadata : log.metadata) : 'Action performed'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link to="/admin/audit-logs" className="mt-5 text-center text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 pt-3 border-t border-slate-50">
                    <span>View complete security audit trail</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* ================= COMMON SEARCH TOOLBAR ================= */}
          {activeView !== 'overview' && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center space-x-3">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={`Search across ${activeView} registry by keyword...`}
                className="flex-1 text-sm bg-transparent border-none outline-none placeholder-slate-400 font-sans"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {/* ================= CHEFS REGISTRY VIEW ================= */}
          {activeView === 'chefs' && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
              <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-display font-bold text-sm text-slate-800 tracking-tight">Registered Chefs de Projet</h3>
                <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{filteredChefs.length} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/20 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Name</th>
                      <th className="px-6 py-3 font-semibold">Email</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold">Created Date</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-sans">
                    {filteredChefs.map((chef) => (
                      <tr key={chef.id} className="hover:bg-slate-50/20">
                        <td className="px-6 py-4 font-medium text-slate-800">{chef.fullName}</td>
                        <td className="px-6 py-4 text-xs">{chef.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${chef.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {chef.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">{new Date(chef.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant={chef.isActive ? 'danger' : 'primary'}
                            className="py-1 px-3.5 text-xs h-8"
                            isLoading={submittingId === chef.id}
                            onClick={() => handleToggleUserStatus(chef.id)}
                          >
                            {chef.isActive ? <UserMinus className="w-3.5 h-3.5 mr-1" /> : <UserCheck className="w-3.5 h-3.5 mr-1" />}
                            <span>{chef.isActive ? 'Deactivate' : 'Activate'}</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredChefs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">No registered Chefs match your search criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= DEVELOPERS REGISTRY VIEW ================= */}
          {activeView === 'developers' && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
              <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-display font-bold text-sm text-slate-800 tracking-tight">Active Developers</h3>
                <span className="font-mono text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{filteredDevs.length} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/20 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Name</th>
                      <th className="px-6 py-3 font-semibold">Email</th>
                      <th className="px-6 py-3 font-semibold">Creator Chef</th>
                      <th className="px-6 py-3 font-semibold">Assigned Team</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-sans">
                    {filteredDevs.map((dev) => (
                      <tr key={dev.id} className="hover:bg-slate-50/20">
                        <td className="px-6 py-4 font-medium text-slate-800">{dev.fullName}</td>
                        <td className="px-6 py-4 text-xs">{dev.email}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{dev.creatorEmail || 'System'}</td>
                        <td className="px-6 py-4">
                          {dev.team ? (
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded text-xs font-semibold">{dev.team.name}</span>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${dev.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {dev.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant={dev.isActive ? 'danger' : 'primary'}
                            className="py-1 px-3.5 text-xs h-8"
                            isLoading={submittingId === dev.id}
                            onClick={() => handleToggleUserStatus(dev.id)}
                          >
                            {dev.isActive ? <UserMinus className="w-3.5 h-3.5 mr-1" /> : <UserCheck className="w-3.5 h-3.5 mr-1" />}
                            <span>{dev.isActive ? 'Deactivate' : 'Activate'}</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredDevs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">No developers match your search criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= PROJECTS PORTFOLIO VIEW ================= */}
          {activeView === 'projects' && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
              <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-display font-bold text-sm text-slate-800 tracking-tight">Unified Project Portfolio</h3>
                <span className="font-mono text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{filteredProjects.length} projects</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/20 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Title</th>
                      <th className="px-6 py-3 font-semibold">Assigned Team</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold">Timeline</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-sans">
                    {filteredProjects.map((proj) => (
                      <tr key={proj.id} className="hover:bg-slate-50/20">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{proj.title}</p>
                            <p className="text-[11px] text-slate-400 line-clamp-1 max-w-sm mt-0.5">{proj.description || 'No descriptive scope provided.'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                          {proj.teamName ? (
                            <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded border border-indigo-100">{proj.teamName}</span>
                          ) : (
                            <span className="text-slate-400 font-normal">No Team</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={proj.status} />
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500 flex flex-col">
                          <span>Start: {proj.startDate ? new Date(proj.startDate).toLocaleDateString() : 'N/A'}</span>
                          <span>Due: {proj.dueDate ? new Date(proj.dueDate).toLocaleDateString() : 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="danger"
                            className="py-1 px-3 h-8 text-xs font-semibold"
                            onClick={() => handleDeleteProject(proj.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            <span>Delete</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredProjects.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">No project containers match search criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= PLATFORM AUDIT TRAIL VIEW ================= */}
          {activeView === 'audit-logs' && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 animate-fade-in">
              <h3 className="font-display font-bold text-sm text-slate-800 tracking-tight flex items-center mb-4 gap-2">
                <History className="w-4.5 h-4.5 text-slate-500" />
                <span>Platform Unified Audit Trail Logs</span>
              </h3>
              <div className="space-y-3.5 font-sans">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-start text-xs border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <span className="font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase mr-2.5 text-[9px] border border-slate-200">
                        {log.action}
                      </span>
                      <span className="text-slate-700 font-medium">
                        {log.metadata ? (log.metadata.startsWith('{') ? JSON.parse(log.metadata).email || JSON.parse(log.metadata).title || log.metadata : log.metadata) : 'Action triggered'}
                      </span>
                      {log.targetType && (
                        <span className="text-slate-400 text-[10px] ml-2 font-semibold">
                          Target: {log.targetType.toUpperCase()} (ID: {log.targetId})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
                {filteredLogs.length === 0 && (
                  <div className="text-center text-slate-400 py-12 text-xs">No audit activity matching your filters has been recorded.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

