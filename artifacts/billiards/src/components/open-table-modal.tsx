import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Table, useOpenSession, getGetTablesQueryKey } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { formatCurrency } from "../lib/format";
import { useAuth } from "../lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";

interface OpenTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
  pricePerHour: number;
}

export function OpenTableModal({ isOpen, onClose, table, pricePerHour }: OpenTableModalProps) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const openMutation = useOpenSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTablesQueryKey() });
        toast({
          title: "Thành công",
          description: `Đã mở ${table?.name}`,
        });
        onClose();
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không thể mở bàn. Vui lòng thử lại.",
        });
      }
    }
  });

  const handleOpen = () => {
    if (!table || !currentUser) return;
    openMutation.mutate({
      data: {
        tableId: table.id,
        userId: currentUser.id,
        pricePerHour
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold uppercase tracking-tight">Xác nhận mở bàn</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn mở bàn này không?
          </DialogDescription>
        </DialogHeader>
        
        {table && (
          <div className="my-6 space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Tên bàn</span>
              <span className="font-mono text-xl font-bold text-foreground">{table.name}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Loại bàn</span>
              <span className="font-mono uppercase">{table.type}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Đơn giá</span>
              <span className="font-mono text-lg font-bold text-primary">
                {formatCurrency(pricePerHour)} / giờ
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto h-12 uppercase tracking-wide">
            Hủy
          </Button>
          <Button onClick={handleOpen} disabled={openMutation.isPending} className="w-full sm:w-auto h-12 font-bold uppercase tracking-wide">
            {openMutation.isPending ? "Đang mở..." : "Mở Bàn Ngay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
