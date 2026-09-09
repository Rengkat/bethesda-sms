"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const PIE_COLORS = ["#1d4ed8", "#0ea5e9", "#f59e0b", "#10b981", "#a855f7", "#ef4444"];

/**
 * Every chart below is wrapped the same way: the SVG itself is
 * `aria-hidden` (a screen reader gets nothing useful trying to read
 * hundreds of individual path/rect elements) and a visually-hidden
 * (`sr-only`) real `<table>` carries the exact same data as an actual
 * accessible alternative — not just a vague one-line summary. This data
 * (the 7-day trend, department split, 6-month donation figures) doesn't
 * exist as text anywhere else on the dashboard, so without this a screen
 * reader user would get zero information from these three charts.
 */
function ChartWithTable({
  ariaLabel,
  table,
  children,
}: {
  ariaLabel: string;
  table: { caption: string; headers: string[]; rows: (string | number)[][] };
  children: React.ReactNode;
}) {
  return (
    <div>
      <div aria-hidden="true">{children}</div>
      <table className="sr-only" aria-label={ariaLabel}>
        <caption className="sr-only">{table.caption}</caption>
        <thead>
          <tr>
            {table.headers.map((h) => (
              <th key={h} scope="col">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row">{cell}</th>
                ) : (
                  <td key={j}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AttendanceTrendChart({
  data,
}: {
  data: { day: string; onTime: number; late: number }[];
}) {
  return (
    <ChartWithTable
      ariaLabel="Attendance for the last 7 days, on-time versus late check-ins per day"
      table={{
        caption: "Attendance for the last 7 days",
        headers: ["Day", "On time", "Late"],
        rows: data.map((d) => [d.day, d.onTime, d.late]),
      }}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="onTime" name="On time" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWithTable>
  );
}

export function DepartmentBreakdownChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ChartWithTable
      ariaLabel="Staff count by department"
      table={{
        caption: "Staff count by department",
        headers: ["Department", "Staff count"],
        rows: data.map((d) => [d.name, d.value]),
      }}
    >
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartWithTable>
  );
}

export function DonationsTrendChart({
  data,
}: {
  data: { month: string; total: number }[];
}) {
  return (
    <ChartWithTable
      ariaLabel="Donations total by month, last 6 months"
      table={{
        caption: "Donations total by month",
        headers: ["Month", "Total (₦)"],
        rows: data.map((d) => [d.month, d.total.toLocaleString()]),
      }}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(value) => `₦${Number(value).toLocaleString()}`} />
          <Line type="monotone" dataKey="total" name="Donations" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartWithTable>
  );
}
