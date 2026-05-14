'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#0066FF', '#3385FF', '#9747FF', '#0098B2', '#00BF40', '#FF4242', '#AEB0B6']

export function CategoryPieChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid rgba(112,115,124,0.22)' }}
          itemStyle={{ color: '#171719', fontWeight: 'bold' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function DailyTrendChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0066FF" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(112,115,124,0.16)" />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#70737C' }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#70737C' }}
        />
        <Tooltip
          contentStyle={{ borderRadius: '12px', border: '1px solid rgba(112,115,124,0.22)', boxShadow: '0 4px 16px rgba(23,23,23,0.08)' }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#0066FF"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorCount)"
          activeDot={{ r: 6, fill: '#0066FF', stroke: '#FFF', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
