'use client';

import { useState } from 'react';
import { MoreVertical, Edit, Eye, Trash2 } from 'lucide-react';
import { Badge, Dropdown } from '@plugspace/ui';

export default function UsersView() {
  const [users, setUsers] = useState([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      plan: 'Pro',
      status: 'active',
      projects: 12,
      joined: '2024-01-15',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      plan: 'Free',
      status: 'active',
      projects: 3,
      joined: '2024-02-20',
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-[#94a3b8] mt-1">Manage all platform users</p>
        </div>
        <div className="flex items-center gap-4">
          <Dropdown
            value="all"
            onValueChange={() => {}}
            options={[
              { value: 'all', label: 'All Users' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Export
          </button>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0F172A] border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">User</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Plan</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Projects</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Joined</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-slate-700 hover:bg-blue-50/5 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-white font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-[#94a3b8]">{user.email}</td>
                <td className="px-6 py-4">
                  <Badge variant={user.plan === 'Pro' ? 'default' : 'secondary'}>
                    {user.plan}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={user.status === 'active' ? 'success' : 'danger'}>
                    {user.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-white">{user.projects}</td>
                <td className="px-6 py-4 text-[#94a3b8]">{user.joined}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-white/5 rounded-lg">
                      <Edit className="w-4 h-4 text-[#94a3b8]" />
                    </button>
                    <button className="p-2 hover:bg-white/5 rounded-lg">
                      <Eye className="w-4 h-4 text-[#94a3b8]" />
                    </button>
                    <button className="p-2 hover:bg-white/5 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
