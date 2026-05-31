"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
  boxShadow: "0 8px 32px -8px rgb(0 0 0 / 0.16)",
  padding: "8px 12px",
};

const axisProps = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

export function DonutChart({
  value,
  label = "Complete",
  data,
}: {
  value: number;
  label?: string;
  data?: { name: string; value: number; color: string }[];
}) {
  const chartData =
    data ?? [
      { name: "Complete", value, color: "hsl(var(--chart-1))" },
      { name: "Remaining", value: 100 - value, color: "hsl(var(--muted))" },
    ];
  return (
    <div className="relative h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">{value}%</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export function MemberBarChart({
  data,
}: {
  data: { name: string; completed: number; pending: number }[];
}) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4} margin={{ left: -16, right: 8, top: 8 }}>
          <CartesianGrid
            vertical={false}
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
          />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis {...axisProps} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <Bar
            dataKey="completed"
            name="Completed"
            fill="hsl(var(--chart-1))"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="pending"
            name="Pending"
            fill="hsl(var(--chart-3))"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({
  data,
}: {
  data: { date: string; completed: number; created: number }[];
}) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-5))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
          />
          <XAxis dataKey="date" {...axisProps} interval={5} />
          <YAxis {...axisProps} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="created"
            name="Created"
            stroke="hsl(var(--chart-5))"
            strokeWidth={2}
            fill="url(#gradCreated)"
          />
          <Area
            type="monotone"
            dataKey="completed"
            name="Completed"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="url(#gradCompleted)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MiniLineChart({
  data,
}: {
  data: { value: number }[];
}) {
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export { CHART_COLORS };
