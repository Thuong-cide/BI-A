import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Table, useCloseSession, getGetTablesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { formatCurrency, formatDuration, calculateDuration } from "../lib/format";
import { useAuth } from "../lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { useEffect, useState } from "react";
import { useGetSettings } from "@workspace/api-client-react";
import { Plus, Trash2 } from "lucide-react";

interface ExtraItem {
  name: string;
  price: number;
}

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
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");

  const pricePerHour = (() => {
    if (!table) return 0;
    const typeKey = `price_${table.type.toLowerCase()}`;
    const priceSetting = settings?.find((s) => s.key === typeKey);
    return priceSetting ? parseInt(priceSetting.value, 10) : 0;
  })();

  useEffect(() => {
    if (!isOpen || !table?.startTime) return;
    setDuration(calculateDuration(table.startTime));
    const interval = setInterval(() => {
      setDuration(calculateDuration(table.startTime!));
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen, table]);

  useEffect(() => {
    if (!isOpen) {
      setExtraItems([]);
      setNewItemName("");
      setNewItemPrice("");
    }
  }, [isOpen]);

  const billiardCost = Math.round((duration / 60) * pricePerHour);
  const extraTotal = extraItems.reduce((sum, item) => sum + item.price, 0);
  const totalCost = billiardCost + extraTotal;

  const handleAddItem = () => {
    const name = newItemName.trim();
    const price = parseInt(newItemPrice.replace(/\D/g, ""), 10);
    if (!name || isNaN(price) || price <= 0) return;
    setExtraItems((prev) => [...prev, { name, price }]);
    setNewItemName("");
    setNewItemPrice("");
  };

  const handleRemoveItem = (idx: number) => {
    setExtraItems((prev) => prev.filter((_, i) => i !== idx));
  };

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
        extraItems: extraItems.length > 0 ? extraItems : undefined,
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-destructive/20 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold uppercase tracking-tight text-destructive">Thanh toán</DialogTitle>
          <DialogDescription>
            Đóng bàn và xuất hóa đơn cho khách.
          </DialogDescription>
        </DialogHeader>
        
        {table && (
          <div className="space-y-4 my-2">
            {/* Billiard bill */}
            <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-0">
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
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground text-sm">Tiền bida</span>
                <span className="font-mono font-semibold">{formatCurrency(billiardCost)}</span>
              </div>
            </div>

            {/* Extra items */}
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dịch vụ thêm</p>

              {extraItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/20 rounded-md border border-border/50">
                  <span className="text-sm flex-1">{item.name}</span>
                  <span className="font-mono text-sm font-medium">{formatCurrency(item.price)}</span>
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="text-destructive hover:text-destructive/70 transition-colors ml-1"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <Input
                  placeholder="Tên (nước, thuốc...)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  className="flex-1 h-9 text-sm"
                />
                <Input
                  placeholder="Giá (VND)"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  className="w-28 h-9 text-sm"
                  type="number"
                  min={0}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-9 px-3"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Total */}
            <div className="bg-muted/30 px-4 py-4 rounded-lg border border-border flex justify-between items-center">
              <span className="text-sm font-bold uppercase tracking-wider">Thành tiền</span>
              <span className="font-mono text-3xl font-bold text-foreground">
                {formatCurrency(totalCost)}
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
