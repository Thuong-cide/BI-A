import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Table, useCloseSession, getGetTablesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { formatCurrency, formatDuration, calculateDuration } from "../lib/format";
import { useAuth } from "../lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { useEffect, useState } from "react";
import { useGetSettings } from "@workspace/api-client-react";

interface CloseTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
}

export function CloseTableModal({ isOpen, onClose, table }: CloseTableModalProps) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings } = useGetSettings();

  const [duration, setDuration] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);

  const pricePerHour = (() => {
    if (!table) return 0;
    const typeKey = `price_${table.type.toLowerCase()}`;
    const priceSetting = settings?.find((s) => s.key === typeKey);
    return priceSetting ? parseInt(priceSetting.value, 10) : 0;
  })();

  useEffect(() => {
    if (isOpen && table?.startTime) {
      const mins = calculateDuration(table.startTime);
      setDuration(mins);
      setEstimatedCost(Math.round((mins / 60) * pricePerHour));
    }
  }, [isOpen, table, pricePerHour]);

  const closeMutation = useCloseSession({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetTablesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({
          title: "Thành công",
          description: `Đã đóng ${table?.name}. Tổng tiền: ${formatCurrency(data.session.amount || 0)}`,
        });
        onClose();
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không thể đóng bàn. Vui lòng thử lại.",
        });
      }
    }
  });

  const handleCloseTable = () => {
    if (!table || !currentUser) return;
    closeMutation.mutate({
      data: {
        tableId: table.id,
        userId: currentUser.id,
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-destructive/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold uppercase tracking-tight text-destructive">Thanh toán</DialogTitle>
          <DialogDescription>
            Đóng bàn và xuất hóa đơn cho khách.
          </DialogDescription>
        </DialogHeader>
        
        {table && (
          <div className="my-6 bg-muted/30 p-4 rounded-lg border border-border">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">Bàn</span>
              <span className="font-mono text-lg font-bold">{table.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">Giờ vào</span>
              <span className="font-mono">
                {new Date(table.startTime!).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">Thời gian</span>
              <span className="font-mono font-bold text-primary">{formatDuration(duration)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 mt-2">
              <span className="text-sm font-bold uppercase tracking-wider">Thành tiền</span>
              <span className="font-mono text-3xl font-bold text-foreground">
                {formatCurrency(estimatedCost)}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto h-12 uppercase tracking-wide">
            Chưa Đóng
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCloseTable} 
            disabled={closeMutation.isPending} 
            className="w-full sm:w-auto h-12 font-bold uppercase tracking-wide"
          >
            {closeMutation.isPending ? "Đang xử lý..." : "Xác Nhận Thu Tiền"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
