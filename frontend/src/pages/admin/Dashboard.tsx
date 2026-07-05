/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { axiosInstance } from '../../api/axios.js';
import { User, AuditLog } from '../../types.js';
import { StatusBadge, Button, Skeleton } from '../../components/common/UI.js';
import {
  Users,
  Briefcase,
  History,
  Shield,
  Search,
  UserCheck,
  UserMinus,
  CheckSquare
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';

export const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, logsRes] = await Promise.all([
        axiosInstance.get('/stats'),
        axiosInstance.get('/users?limit=100'),
        axiosInstance.get('/audit-logs?limit=15')
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (logsRes.data.success) setAuditLogs(logsRes.data.data);
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

  const chefs = users.filter((u) => u.role === 'chef_projet');
  const developers = users.filter((u) => u.role === 'developer');

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

  // Chart Formatting
  const COLORS = ['#94a3b8', '#3b82f6', '#10b981', '#f59e0b']; // todo, in_progress, done, on_hold
  const pieData = stats
    ? [
        { name: 'To Do', value: stats.projects.todo },
        { name: 'In Progress', value: stats.projects.in_progress },
        { name: 'Completed', value: stats.projects.done },
        { name: 'On Hold', value: stats.projects.on_hold }
      ].filter((d) => d.value > 0)
    : [];

  const taskBarData = stats
    ? [
        { name: 'To Do', tasks: stats.tasks.todo },
        { name: 'In Progress', tasks: stats.tasks.in_progress },
        { name: 'Completed', tasks: stats.tasks.done }
      ]
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <span>Admin Console</span>
          </h1>
          <p className="font-sans text-xs text-slate-500 mt-1">Platform management and unified security logs</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm h-28 flex flex-col justify-between">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="font-sans text-xs font-semibold text-slate-400 block uppercase tracking-wider">Total Chefs</span>
                <span className="font-display font-bold text-2xl text-slate-800">{stats?.users.totalChefs || 0}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="font-sans text-xs font-semibold text-slate-400 block uppercase tracking-wider">Total Developers</span>
                <span className="font-display font-bold text-2xl text-slate-800">{stats?.users.totalDevs || 0}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <span className="font-sans text-xs font-semibold text-slate-400 block uppercase tracking-wider">Active Teams</span>
                <span className="font-display font-bold text-2xl text-slate-800">{stats?.teamsCount || 0}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <span className="font-sans text-xs font-semibold text-slate-400 block uppercase tracking-wider">Completed Tasks</span>
                <span className="font-display font-bold text-2xl text-slate-800">{stats?.tasks.done || 0}</span>
              </div>
            </div>
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

          {/* Global Search Tool */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center space-x-3">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search across all tables by name or email..."
              className="flex-1 text-sm bg-transparent border-none outline-none placeholder-slate-400 font-sans"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Chefs Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${chef.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
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
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">No registered Chefs match your search criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Developers Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${dev.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
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
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">No developers match your search criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Row */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-display font-bold text-sm text-slate-800 tracking-tight flex items-center mb-4 gap-2">
              <History className="w-4.5 h-4.5 text-slate-500" />
              <span>Platform Activity Feed (Audit Trail)</span>
            </h3>
            <div className="space-y-3.5 font-sans">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex justify-between items-start text-xs border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase mr-2.5 text-[9px]">
                      {log.action}
                    </span>
                    <span className="text-slate-600">{log.metadata ? JSON.parse(log.metadata).email || JSON.parse(log.metadata).title || log.metadata : 'Performed Action'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="text-center text-slate-400 py-6 text-xs">No audit logs saved yet.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
