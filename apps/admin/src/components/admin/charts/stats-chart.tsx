'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface StatsChartProps {
  type: 'line' | 'bar';
}

const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

const lineData = {
  labels,
  datasets: [
    {
      label: 'Users',
      data: [3200, 4500, 5800, 7200, 9100, 11000, 12453],
      borderColor: 'rgb(139, 92, 246)',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      fill: true,
      tension: 0.4,
    },
  ],
};

const barData = {
  labels,
  datasets: [
    {
      label: 'Revenue',
      data: [45000, 52000, 68000, 85000, 95000, 108000, 125400],
      backgroundColor: 'rgba(34, 197, 94, 0.8)',
      borderRadius: 4,
    },
  ],
};

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.05)',
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.5)',
      },
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.05)',
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.5)',
      },
    },
  },
};

export function StatsChart({ type }: StatsChartProps) {
  return (
    <div className="h-64">
      {type === 'line' ? (
        <Line data={lineData} options={options} />
      ) : (
        <Bar data={barData} options={options} />
      )}
    </div>
  );
}
