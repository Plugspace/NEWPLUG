'use client';

import { 
  Users, 
  FolderKanban, 
  DollarSign, 
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe
} from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { StatsChart } from './charts/stats-chart';

const stats = [
  { 
    label: 'Total Users', 
    value: 12453, 
    change: 12.5, 
    trend: 'up',
    icon: Users, 
    color: 'from-blue-500 to-cyan-500' 
  },
  { 
    label: 'Active Projects', 
    value: 45231, 
    change: 8.2, 
    trend: 'up',
    icon: FolderKanban, 
    color: 'from-purple-500 to-pink-500' 
  },
  { 
    label: 'Revenue', 
    value: 125400, 
    change: -2.3, 
    trend: 'down',
    icon: DollarSign, 
    color: 'from-green-500 to-emerald-500' 
  },
  { 
    label: 'API Requests', 
    value: 2340000, 
    change: 15.8, 
    trend: 'up',
    icon: Activity, 
    color: 'from-orange-500 to-yellow-500' 
  },
];

const recentActivity = [
  { id: 1, user: 'john@example.com', action: 'Published a new project', time: '2 min ago', type: 'success' },
  { id: 2, user: 'jane@example.com', action: 'Upgraded to Pro plan', time: '15 min ago', type: 'info' },
  { id: 3, user: 'bob@example.com', action: 'Failed login attempt', time: '32 min ago', type: 'warning' },
  { id: 4, user: 'alice@example.com', action: 'Created new project', time: '1 hour ago', type: 'success' },
  { id: 5, user: 'charlie@example.com', action: 'Deleted project', time: '2 hours ago', type: 'info' },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Welcome back, Master Admin</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center text-sm ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {stat.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {Math.abs(stat.change)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {stat.label === 'Revenue' 
                ? formatCurrency(stat.value) 
                : formatNumber(stat.value)}
            </div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">User Growth</h3>
          <StatsChart type="line" />
        </div>
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue</h3>
          <StatsChart type="bar" />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-3 bg-surface-solid rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.type === 'success' ? 'bg-green-500/20 text-green-500' :
                  activity.type === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
                  'bg-blue-500/20 text-blue-500'
                }`}>
                  {activity.type === 'success' && <CheckCircle className="w-4 h-4" />}
                  {activity.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                  {activity.type === 'info' && <Activity className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.user}</p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
          <div className="space-y-4">
            {[
              { name: 'API Server', status: 'operational' },
              { name: 'Database', status: 'operational' },
              { name: 'Redis Cache', status: 'operational' },
              { name: 'CDN', status: 'operational' },
              { name: 'Voice API', status: 'degraded' },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{service.name}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  service.status === 'operational' 
                    ? 'bg-green-500/20 text-green-500' 
                    : 'bg-yellow-500/20 text-yellow-500'
                }`}>
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
