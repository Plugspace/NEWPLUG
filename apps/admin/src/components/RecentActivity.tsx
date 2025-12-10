'use client';

import { UserPlus, FileText, Settings, AlertCircle } from 'lucide-react';

const activities = [
  {
    icon: UserPlus,
    iconBg: 'bg-blue-600/20',
    iconColor: 'text-blue-400',
    title: 'New user registered',
    description: 'john.doe@example.com joined the platform',
    time: '2 minutes ago',
  },
  {
    icon: FileText,
    iconBg: 'bg-green-600/20',
    iconColor: 'text-green-400',
    title: 'Project published',
    description: 'E-commerce store "FashionHub" went live',
    time: '15 minutes ago',
  },
  {
    icon: Settings,
    iconBg: 'bg-purple-600/20',
    iconColor: 'text-purple-400',
    title: 'System configuration updated',
    description: 'AI agent settings modified',
    time: '1 hour ago',
  },
  {
    icon: AlertCircle,
    iconBg: 'bg-orange-600/20',
    iconColor: 'text-orange-400',
    title: 'High API usage detected',
    description: 'Organization "Acme Corp" exceeded rate limit',
    time: '2 hours ago',
  },
];

export default function RecentActivity() {
  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const Icon = activity.icon;
        return (
          <div
            key={index}
            className="flex items-start gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className={`w-10 h-10 ${activity.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${activity.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-white">{activity.title}</h4>
              <p className="text-sm text-[#94a3b8] mt-1">{activity.description}</p>
              <p className="text-xs text-[#64748b] mt-2">{activity.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
