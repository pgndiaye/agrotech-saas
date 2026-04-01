'use client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const formatFCFA = (n: number) =>
  new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);

export default function DashboardAreaChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => [formatFCFA(v), '']} />
        <Area type="monotone" dataKey="income" stackId="1" stroke="#22c55e" fill="#dcfce7" name="Revenus" />
        <Area type="monotone" dataKey="expense" stackId="2" stroke="#ef4444" fill="#fee2e2" name="Dépenses" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
