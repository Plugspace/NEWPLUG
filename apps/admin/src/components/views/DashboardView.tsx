'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, TrendingUp, TrendingDown, Users, FolderKanban, DollarSign, Activity } from 'lucide-react';
import { Button } from '@plugspace/ui';
import UserGrowthChart from '../charts/UserGrowthChart';
import RevenueChart from '../charts/RevenueChart';
import RecentActivity from '../RecentActivity';

export default function DashboardView() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    revenue: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    // TODO: Fetch from tRPC admin.stats
    setStats({
      totalUsers: 1247,
      totalProjects: 3421,
      revenue: 45230,
      activeUsers: 892,
    });
  }, []);

  const statCards = [
    {
      icon: Users,
      iconBg: 'bg-blue-600/20',
      iconColor: 'text-blue-400',
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      trend: { direction: 'up' as const, percentage: 12.5, label: 'vs last month' },
    },
    {
      icon: FolderKanban,
      iconBg: 'bg-green-600/20',
      iconColor: 'text-green-400',
      title: 'Total Projects',
      value: stats.totalProjects.toLocaleString(),
      trend: { direction: 'up' as const, percentage: 8.3, label: 'vs last month' },
    },
    {
      icon: DollarSign,
      iconBg: 'bg-purple-600/20',
      iconColor: 'text-purple-400',
      title: 'Revenue',
      value: `$${stats.revenue.toLocaleString()}`,
      trend: { direction: 'up' as const, percentage: 15.2, label: 'vs last month' },
    },
    {
      icon: Activity,
      iconBg: 'bg-orange-600/20',
      iconColor: 'text-orange-400',
      title: 'Active Users',
      value: stats.activeUsers.toLocaleString(),
      trend: { direction: 'up' as const, percentage: 5.7, label: 'vs last month' },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-[#94a3b8] mt-1">System overview and analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 pl-10 pr-4 py-2 bg-[#0F172A] border border-slate-700 rounded-lg text-white placeholder:text-[#94a3b8] focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-[#94a3b8]">All Systems Operational</span>
          </div>
          <Button variant="indigo">
            <Plus className="w-4 h-4 mr-2" />
            Quick Action
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="glass rounded-xl p-6 hover:scale-105 transition-transform cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                {stat.trend.direction === 'up' ? (
                  <div className="flex items-center gap-1 text-green-400">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">+{stat.trend.percentage}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-400">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm font-medium">-{stat.trend.percentage}%</span>
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-sm text-[#94a3b8]">{stat.title}</p>
              <p className="text-xs text-[#64748b] mt-2">{stat.trend.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">User Growth</h3>
          <UserGrowthChart />
        </div>
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue</h3>
          <RevenueChart />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <RecentActivity />
      </div>
    </div>
  );
}
