'use client';

import { useState } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Mail, 
  Ban, 
  Trash2,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mockUsers = [
  { id: '1', email: 'john@example.com', name: 'John Doe', role: 'USER', tier: 'PRO', projects: 12, lastLogin: '2024-01-15', status: 'active' },
  { id: '2', email: 'jane@example.com', name: 'Jane Smith', role: 'STUDIO_ADMIN', tier: 'ENTERPRISE', projects: 45, lastLogin: '2024-01-14', status: 'active' },
  { id: '3', email: 'bob@example.com', name: 'Bob Wilson', role: 'USER', tier: 'FREE', projects: 3, lastLogin: '2024-01-10', status: 'inactive' },
  { id: '4', email: 'alice@example.com', name: 'Alice Brown', role: 'USER', tier: 'PRO', projects: 8, lastLogin: '2024-01-15', status: 'active' },
  { id: '5', email: 'charlie@example.com', name: 'Charlie Davis', role: 'USER', tier: 'FREE', projects: 2, lastLogin: '2024-01-12', status: 'banned' },
];

export function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const filteredUsers = mockUsers.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectUser = (id: string) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400">Manage platform users and their permissions</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-primary-700 hover:bg-primary-600 text-white rounded-lg transition-colors">
          <UserPlus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-solid border border-surface-light rounded-lg pl-10 pr-4 py-2 w-64 text-white placeholder-gray-500 focus:outline-none focus:border-primary-700"
            />
          </div>
          <button className="flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {selectedUsers.length > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-400">{selectedUsers.length} selected</span>
            <button className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </button>
            <button className="flex items-center space-x-1 px-3 py-1.5 text-sm text-yellow-500 hover:text-yellow-400 transition-colors">
              <Ban className="w-4 h-4" />
              <span>Ban</span>
            </button>
            <button className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-500 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-light">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-primary-700"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Tier</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Projects</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Last Login</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-surface-light/50 hover:bg-surface-light/30 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleSelectUser(user.id)}
                    className="w-4 h-4 accent-primary-700"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-sm font-medium">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'px-2 py-1 text-xs rounded-full',
                    user.role === 'STUDIO_ADMIN' ? 'bg-purple-500/20 text-purple-400' :
                    user.role === 'MASTER_ADMIN' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  )}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'px-2 py-1 text-xs rounded-full',
                    user.tier === 'ENTERPRISE' ? 'bg-amber-500/20 text-amber-400' :
                    user.tier === 'PRO' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  )}>
                    {user.tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300">{user.projects}</td>
                <td className="px-4 py-3 text-gray-400">{user.lastLogin}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'px-2 py-1 text-xs rounded-full',
                    user.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    user.status === 'banned' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  )}>
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="p-1 hover:bg-surface-light rounded transition-colors">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-surface-light">
          <span className="text-sm text-gray-400">Showing 1-5 of 12,453 users</span>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-surface-light rounded transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <button className="px-3 py-1 bg-primary-700 text-white rounded">1</button>
            <button className="px-3 py-1 text-gray-400 hover:bg-surface-light rounded">2</button>
            <button className="px-3 py-1 text-gray-400 hover:bg-surface-light rounded">3</button>
            <button className="p-2 hover:bg-surface-light rounded transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
