import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table } from "@workspace/api-client-react";
import { formatCurrency } from "../lib/format";
import { Plus, Trash2, ShoppingBag } from "lucide-react";

export interface ExtraItem {
  name: string;
  price: number;
}

interface AddProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
  items: ExtraItem[];
  onItemsChange: (items: ExtraItem[]) => void;
}

export function AddProductsModal({ isOpen, onClose, table, items, onItemsChange }: AddProductsModalProps) {
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");

  const handleAdd = () => {
    const name = newItemName.trim();
    const price = parseInt(newItemPrice.replace(/\D/g, ""), 10);
    if (!name || isNaN(price) || price <= 0) return;
    onItemsChange([...items, { name, price }]);
    setNewItemName("");
    setNewItemPrice("");
  };

  const handleRemove = (idx: number) => {
    onItemsChange(items.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold uppercase tracking-tight">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Sản phẩm — {table?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 my-2">
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-20 border border-dashed border-muted rounded-md">
              <span className="text-sm text-muted-foreground">Chưa có sản phẩm nào</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/20 rounded-md border border-border/50"
                >
                  <span className="text-sm flex-1 font-medium">{item.name}</span>
                  <span className="font-mono text-sm">{formatCurrency(item.price)}</span>
                  <button
                    onClick={() => handleRemove(idx)}
                    className="text-destructive hover:text-destructive/70 transition-colors ml-1 shrink-0"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Tên SP (nước, thuốc...)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-9 text-sm"
              autoFocus
            />
            <Input
              placeholder="Giá (VND)"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-28 h-9 text-sm"
              type="number"
              min={0}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="h-9 px-3">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {items.length > 0 && (
            <div className="flex justify-between items-center px-3 py-2 bg-primary/5 rounded-md border border-primary/20">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Tổng SP ({items.length})
              </span>
              <span className="font-mono font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full h-11 font-bold uppercase tracking-wide">
            Xong
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
