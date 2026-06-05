import { useState } from "react";
import { Table, useGetTables, useGetDashboardSummary, getGetTablesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Layout } from "../components/layout";
import { TableCard } from "../components/table-card";
import { formatCurrency, formatDuration } from "../lib/format";
import { OpenTableModal } from "../components/open-table-modal";
import { CloseTableModal } from "../components/close-table-modal";
import { AddProductsModal, ExtraItem } from "../components/add-products-modal";
import { Card, CardContent } from "../components/ui/card";
import { Activity, Coins, Clock } from "lucide-react";
import { useSocketEvents } from "../lib/socket";

export default function Dashboard() {
  useSocketEvents();

  const { data: summary } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey(),
      refetchInterval: 60000,
    }
  });

  const { data: tables } = useGetTables({
    query: {
      queryKey: getGetTablesQueryKey(),
      refetchInterval: 15000,
    }
  });

  const [openModalState, setOpenModalState] = useState<{ isOpen: boolean; table: Table | null; price: number }>({
    isOpen: false,
    table: null,
    price: 0,
  });

  const [closeModalState, setCloseModalState] = useState<{ isOpen: boolean; table: Table | null }>({
    isOpen: false,
    table: null,
  });

  const [addProductsModalState, setAddProductsModalState] = useState<{ isOpen: boolean; table: Table | null }>({
    isOpen: false,
    table: null,
  });

  // Map of tableId → pending extra items added during the session
  const [pendingItems, setPendingItems] = useState<Record<string, ExtraItem[]>>({});

  const handleOpenClick = (table: Table, price: number) => {
    setOpenModalState({ isOpen: true, table, price });
  };

  const handleCloseClick = (table: Table) => {
    setCloseModalState({ isOpen: true, table });
  };

  const handleAddProductsClick = (table: Table) => {
    setAddProductsModalState({ isOpen: true, table });
  };

  const handleProductsChange = (tableId: string, items: ExtraItem[]) => {
    setPendingItems((prev) => ({ ...prev, [tableId]: items }));
  };

  const handleSessionClosed = (tableId: string) => {
    setPendingItems((prev) => {
      const next = { ...prev };
      delete next[tableId];
      return next;
    });
  };

  const activeTable = addProductsModalState.table;
  const closeTable = closeModalState.table;

  return (
    <Layout>
      <div className="p-4 sm:p-6 sm:max-w-7xl mx-auto space-y-6">
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 sm:p-6 flex flex-col gap-1">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Activity className="h-4 w-4 mr-2 text-primary" />
                Bàn đang chơi
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-primary">
                {summary?.activeTablesCount || 0}
                <span className="text-base font-normal text-muted-foreground ml-1">/ {summary?.totalTablesCount || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6 flex flex-col gap-1">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Coins className="h-4 w-4 mr-2 text-primary" />
                Doanh thu h.nay
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono">
                {formatCurrency(summary?.todayRevenue || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 md:col-span-1">
            <CardContent className="p-4 sm:p-6 flex flex-col gap-1">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Clock className="h-4 w-4 mr-2 text-primary" />
                Tổng giờ chơi
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono">
                {formatDuration(summary?.todayTotalMinutes || 0)}
                <span className="text-base font-normal text-muted-foreground ml-2">({summary?.todaySessionsCount || 0} ca)</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {tables?.map((table) => (
            <TableCard 
              key={table.id} 
              table={table} 
              onOpen={handleOpenClick} 
              onClose={handleCloseClick}
              onAddProducts={handleAddProductsClick}
              pendingItemsCount={pendingItems[table.id]?.length ?? 0}
            />
          ))}
        </div>
      </div>

      <OpenTableModal 
        isOpen={openModalState.isOpen}
        onClose={() => setOpenModalState((prev) => ({ ...prev, isOpen: false }))}
        table={openModalState.table}
        pricePerHour={openModalState.price}
      />

      <CloseTableModal 
        isOpen={closeModalState.isOpen}
        onClose={() => setCloseModalState((prev) => ({ ...prev, isOpen: false }))}
        table={closeTable}
        initialExtraItems={closeTable ? (pendingItems[closeTable.id] ?? []) : []}
        onClosed={() => closeTable && handleSessionClosed(closeTable.id)}
      />

      <AddProductsModal
        isOpen={addProductsModalState.isOpen}
        onClose={() => setAddProductsModalState((prev) => ({ ...prev, isOpen: false }))}
        table={activeTable}
        items={activeTable ? (pendingItems[activeTable.id] ?? []) : []}
        onItemsChange={(items) => activeTable && handleProductsChange(activeTable.id, items)}
      />
    </Layout>
  );
}
