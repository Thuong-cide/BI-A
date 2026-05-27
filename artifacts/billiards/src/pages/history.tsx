import { useState } from "react";
import { useGetSessions, getGetSessionsQueryKey, useGetTables } from "@workspace/api-client-react";
import { Layout } from "../components/layout";
import { formatCurrency, formatDuration } from "../lib/format";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export default function History() {
  const [date, setDate] = useState("");
  const [tableId, setTableId] = useState<string>("all");

  const { data: tables } = useGetTables();

  const params = {
    date: date || undefined,
    tableId: tableId === "all" ? undefined : tableId,
  };

  const { data: sessions, isLoading } = useGetSessions(params, {
    query: {
      queryKey: getGetSessionsQueryKey(params),
    }
  });

  return (
    <Layout>
      <div className="p-4 sm:p-6 sm:max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight uppercase">Lịch Sử Phiên Chơi</h1>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full sm:w-auto"
            />
            <Select value={tableId} onValueChange={setTableId}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tất cả bàn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả bàn</SelectItem>
                {tables?.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">Bàn</th>
                    <th className="px-4 py-3 font-medium">Bắt đầu</th>
                    <th className="px-4 py-3 font-medium">Kết thúc</th>
                    <th className="px-4 py-3 font-medium">Thời gian</th>
                    <th className="px-4 py-3 font-medium text-right">Tổng tiền</th>
                    <th className="px-4 py-3 font-medium">Nhân viên</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : !sessions || sessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Không có dữ liệu cho ngày này.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold">{session.tableName}</div>
                          <Badge variant="outline" className="text-[10px] mt-1 uppercase">{session.tableType}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {new Date(session.startTime).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {session.endTime ? new Date(session.endTime).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "-"}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {session.durationMinutes ? formatDuration(session.durationMinutes) : "-"}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-right text-primary">
                          {session.amount != null ? formatCurrency(session.amount) : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs">{session.openedByName}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
