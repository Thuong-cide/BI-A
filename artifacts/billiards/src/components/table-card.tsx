import { useEffect, useState } from "react";
import { Table, useGetSettings } from "@workspace/api-client-react";
import { formatCurrency, formatDuration, calculateDuration } from "../lib/format";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Clock, Play, Square, ShoppingBag } from "lucide-react";

interface TableCardProps {
  table: Table;
  onOpen: (table: Table, price: number) => void;
  onClose: (table: Table) => void;
  onAddProducts?: (table: Table) => void;
  pendingItemsCount?: number;
}

export function TableCard({ table, onOpen, onClose, onAddProducts, pendingItemsCount = 0 }: TableCardProps) {
  const { data: settings } = useGetSettings();
  const isActive = table.status === "active";
  
  const [duration, setDuration] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);

  const typeKey = `price_${table.type.toLowerCase()}`;
  const priceSetting = settings?.find((s) => s.key === typeKey);
  const pricePerHour = priceSetting ? parseInt(priceSetting.value, 10) : 0;

  useEffect(() => {
    let interval: number;

    if (isActive && table.startTime) {
      const updateTime = () => {
        const mins = calculateDuration(table.startTime!);
        setDuration(mins);
        setEstimatedCost(Math.round((mins / 60) * pricePerHour));
      };
      
      updateTime();
      interval = window.setInterval(updateTime, 1000 * 60); // update every minute
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, table.startTime, pricePerHour]);

  return (
    <Card className={`relative overflow-hidden flex flex-col justify-between transition-colors ${isActive ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold font-mono tracking-tight">{table.name}</h3>
            <Badge variant="outline" className="mt-1 font-mono text-[10px] uppercase">
              {table.type}
            </Badge>
          </div>
          <Badge variant={isActive ? "default" : "secondary"} className="uppercase font-mono tracking-wider text-[10px]">
            {isActive ? "ĐANG CHƠI" : "TRỐNG"}
          </Badge>
        </div>

        {isActive ? (
          <div className="mt-4 flex flex-col gap-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> Bắt đầu
              </span>
              <span className="font-mono">
                {new Date(table.startTime!).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Thời gian</span>
              <span className="font-mono text-primary font-bold">{formatDuration(duration)}</span>
            </div>
            <div className="flex justify-between text-sm mt-2 pt-2 border-t border-border">
              <span className="text-muted-foreground">Tạm tính</span>
              <span className="font-mono text-lg font-bold text-foreground">{formatCurrency(estimatedCost)}</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex-1 flex items-center justify-center min-h-[100px] border border-dashed border-muted rounded-md bg-muted/20">
            <span className="text-sm font-mono text-muted-foreground/50">SẴN SÀNG</span>
          </div>
        )}
      </div>

      <div className="p-4 pt-0 flex flex-col gap-2">
        {isActive ? (
          <>
            <Button
              variant="outline"
              className="w-full font-bold uppercase tracking-wider h-10 border-primary/30 text-primary hover:bg-primary/10 relative"
              onClick={() => onAddProducts?.(table)}
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Thêm Sản Phẩm
              {pendingItemsCount > 0 && (
                <span className="absolute top-1.5 right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {pendingItemsCount}
                </span>
              )}
            </Button>
            <Button 
              variant="destructive" 
              className="w-full font-bold uppercase tracking-wider h-12" 
              onClick={() => onClose(table)}
            >
              <Square className="h-5 w-5 mr-2 fill-current" />
              Đóng Bàn
            </Button>
          </>
        ) : (
          <Button 
            className="w-full font-bold uppercase tracking-wider h-12" 
            onClick={() => onOpen(table, pricePerHour)}
          >
            <Play className="h-5 w-5 mr-2 fill-current" />
            Mở Bàn
          </Button>
        )}
      </div>
    </Card>
  );
}
