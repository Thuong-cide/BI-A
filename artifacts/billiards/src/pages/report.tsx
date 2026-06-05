import { useState } from "react";
import { useGetRevenueReport } from "@workspace/api-client-react";
import { Layout } from "../components/layout";
import { formatCurrency } from "../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Receipt, ShoppingBag } from "lucide-react";

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { from: fmt(from), to: fmt(to) };
}

function formatDateLabel(dateStr: string) {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm space-y-1">
        <p className="font-bold text-foreground mb-2">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-mono font-medium">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Report() {
  const defaults = getDefaultRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [queryRange, setQueryRange] = useState(defaults);

  const { data, isLoading } = useGetRevenueReport({ from: queryRange.from, to: queryRange.to });

  const chartData = data?.data.map((d) => ({
    date: formatDateLabel(d.date),
    "Bida": d.billiardRevenue,
    "Dịch vụ": d.extraRevenue,
  })) ?? [];

  return (
    <Layout>
      <div className="p-4 sm:p-6 sm:max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight uppercase">Báo Cáo Doanh Thu</h1>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-end">
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="flex flex-col gap-1 flex-1 sm:flex-initial">
                <label className="text-xs text-muted-foreground">Từ ngày</label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-auto" />
              </div>
              <div className="flex flex-col gap-1 flex-1 sm:flex-initial">
                <label className="text-xs text-muted-foreground">Đến ngày</label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-auto" />
              </div>
            </div>
            <Button onClick={() => setQueryRange({ from, to })} className="w-full sm:w-auto">
              Xem báo cáo
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 sm:p-6 flex flex-col gap-1">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                Tổng doanh thu
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-primary">
                {isLoading ? "..." : formatCurrency(data?.totalRevenue ?? 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6 flex flex-col gap-1">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Receipt className="h-4 w-4 mr-2 text-primary" />
                Số ca chơi
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono">
                {isLoading ? "..." : data?.totalSessions ?? 0}
                <span className="text-base font-normal text-muted-foreground ml-2">ca</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6 flex flex-col gap-1">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <ShoppingBag className="h-4 w-4 mr-2 text-primary" />
                Dịch vụ thêm
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono">
                {isLoading ? "..." : formatCurrency(data?.totalExtraRevenue ?? 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold uppercase tracking-wide text-muted-foreground">
              Doanh thu theo ngày
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Đang tải dữ liệu...
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Không có dữ liệu trong khoảng thời gian này.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(v: number) => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                      return String(v);
                    }}
                    tick={{ fontSize: 11 }}
                    width={52}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Bida" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Dịch vụ" stackId="a" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Data table */}
        {!isLoading && chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold uppercase tracking-wide text-muted-foreground">
                Chi tiết từng ngày
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium">Ngày</th>
                      <th className="px-4 py-3 font-medium text-right">Số ca</th>
                      <th className="px-4 py-3 font-medium text-right">Tiền bida</th>
                      <th className="px-4 py-3 font-medium text-right">Dịch vụ</th>
                      <th className="px-4 py-3 font-medium text-right">Tổng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data?.data.map((row) => (
                      <tr key={row.date} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono">{row.date}</td>
                        <td className="px-4 py-3 font-mono text-right">{row.sessionCount}</td>
                        <td className="px-4 py-3 font-mono text-right">{formatCurrency(row.billiardRevenue)}</td>
                        <td className="px-4 py-3 font-mono text-right text-primary">{formatCurrency(row.extraRevenue)}</td>
                        <td className="px-4 py-3 font-mono font-bold text-right">{formatCurrency(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 border-t-2 border-border">
                    <tr>
                      <td className="px-4 py-3 font-bold">Tổng cộng</td>
                      <td className="px-4 py-3 font-mono font-bold text-right">{data?.totalSessions}</td>
                      <td className="px-4 py-3 font-mono font-bold text-right">
                        {formatCurrency((data?.totalRevenue ?? 0) - (data?.totalExtraRevenue ?? 0))}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-right text-primary">
                        {formatCurrency(data?.totalExtraRevenue ?? 0)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-right text-primary text-base">
                        {formatCurrency(data?.totalRevenue ?? 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
