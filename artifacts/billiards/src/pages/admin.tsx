import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { Layout } from "../components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useGetTables, useCreateTable, useDeleteTable, getGetTablesQueryKey } from "@workspace/api-client-react";
import { useGetUsers, useCreateUser, useDeleteUser, getGetUsersQueryKey } from "@workspace/api-client-react";
import { useGetSettings, useUpsertSetting, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";

function TablesManager() {
  const { data: tables } = useGetTables();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Pool");

  const createMutation = useCreateTable({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTablesQueryKey() });
        setIsAdding(false);
        setNewName("");
        toast({ title: "Đã thêm bàn" });
      }
    }
  });

  const deleteMutation = useDeleteTable({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTablesQueryKey() });
        toast({ title: "Đã xóa bàn" });
      }
    }
  });

  const handleAdd = () => {
    if (!newName) return;
    createMutation.mutate({ data: { name: newName, type: newType } });
  };

  const handleDelete = (id: string) => {
    if (confirm("Chắc chắn muốn xóa bàn này?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Danh sách Bàn</h2>
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "outline" : "default"}>
          {isAdding ? "Hủy" : "Thêm Bàn"}
        </Button>
      </div>

      {isAdding && (
        <Card className="bg-muted/20 border-primary/20">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <Input placeholder="Tên bàn (VD: Bàn 01)" value={newName} onChange={e => setNewName(e.target.value)} />
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pool">Pool</SelectItem>
                <SelectItem value="Libre">Libre</SelectItem>
                <SelectItem value="Snooker">Snooker</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Lưu</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {tables?.map(t => (
          <div key={t.id} data-testid={`row-table-${t.id}`} className="flex justify-between items-center p-4 border border-border rounded-md bg-card">
            <div>
              <div className="font-bold font-mono">{t.name}</div>
              <Badge variant="outline" className="mt-1 text-[10px] uppercase">{t.type}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={t.status === "active" ? "default" : "secondary"}>
                {t.status === "active" ? "ĐANG CHƠI" : "TRỐNG"}
              </Badge>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(t.id)} disabled={t.status === "active" || deleteMutation.isPending}>
                Xóa
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersManager() {
  const { data: users } = useGetUsers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", name: "", role: "nhanvien", shift: "Ca 1" });

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
        setIsAdding(false);
        setNewUser({ username: "", password: "", name: "", role: "nhanvien", shift: "Ca 1" });
        toast({ title: "Đã thêm nhân viên" });
      }
    }
  });

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
        toast({ title: "Đã xóa nhân viên" });
      }
    }
  });

  const handleAdd = () => {
    if (!newUser.username || !newUser.password || !newUser.name) return;
    createMutation.mutate({ data: newUser });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Danh sách Nhân viên</h2>
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "outline" : "default"}>
          {isAdding ? "Hủy" : "Thêm N.Viên"}
        </Button>
      </div>

      {isAdding && (
        <Card className="bg-muted/20 border-primary/20">
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="Tên đăng nhập" value={newUser.username} onChange={e => setNewUser(p => ({...p, username: e.target.value}))} />
            <Input placeholder="Mật khẩu" type="password" value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} />
            <Input placeholder="Tên hiển thị" value={newUser.name} onChange={e => setNewUser(p => ({...p, name: e.target.value}))} />
            <Select value={newUser.role} onValueChange={v => setNewUser(p => ({...p, role: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nhanvien">Nhân viên</SelectItem>
                <SelectItem value="quanly">Quản lý</SelectItem>
              </SelectContent>
            </Select>
            <div className="sm:col-span-2">
              <Button onClick={handleAdd} disabled={createMutation.isPending} className="w-full">Lưu</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {users?.map(u => (
          <div key={u.id} data-testid={`row-user-${u.id}`} className="flex justify-between items-center p-4 border border-border rounded-md bg-card">
            <div>
              <div className="font-bold">{u.name} <span className="font-normal text-muted-foreground text-sm">({u.username})</span></div>
              <Badge variant="outline" className="mt-1 text-[10px] uppercase">{u.role}</Badge>
            </div>
            <Button variant="destructive" size="sm" onClick={() => { if(confirm("Xóa?")) deleteMutation.mutate({ id: u.id }) }} disabled={deleteMutation.isPending}>
              Xóa
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsManager() {
  const { data: settings } = useGetSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const upsertMutation = useUpsertSetting({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Đã lưu cài đặt" });
      }
    }
  });

  const getSetting = (key: string) => settings?.find(s => s.key === key)?.value ?? "";

  const handleSave = (key: string, value: string) => {
    if (!value) return;
    upsertMutation.mutate({ key, data: { value } });
  };

  return (
    <div className="space-y-6">
      {/* Price settings */}
      <div>
        <h2 className="text-xl font-bold mb-3">Cài đặt Giá</h2>
        <Card>
          <CardContent className="p-4 space-y-1 divide-y divide-border">
            {[
              { label: "Pool", key: "price_pool" },
              { label: "Libre", key: "price_libre" },
              { label: "Snooker", key: "price_snooker" },
            ].map(({ label, key }) => (
              <div key={key} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 py-3">
                <div>
                  <div className="font-bold uppercase">{label}</div>
                  <div className="text-sm text-muted-foreground">Giá mỗi giờ chơi</div>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    defaultValue={getSetting(key)}
                    className="w-36 font-mono"
                    data-testid={`input-price-${label.toLowerCase()}`}
                    onBlur={(e) => handleSave(key, e.target.value)}
                  />
                  <span className="text-sm font-bold text-primary">VND</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground text-center mt-2">Nhấn ra ngoài ô nhập để lưu tự động</p>
      </div>

      {/* Google Sheets settings */}
      <div>
        <h2 className="text-xl font-bold mb-1">Google Sheets</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Mỗi lần đóng bàn sẽ tự động ghi vào Google Sheet. Chia sẻ sheet với{" "}
          <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">bi-223@anh-hoa-497611.iam.gserviceaccount.com</span>{" "}
          (Editor).
        </p>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <div className="font-bold">Sheet ID</div>
                <div className="text-sm text-muted-foreground">Lấy từ URL của Google Sheet</div>
              </div>
              <div className="flex gap-2 items-center w-full sm:w-auto">
                <Input
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  defaultValue={getSetting("google_sheet_id")}
                  className="font-mono text-xs sm:w-80"
                  data-testid="input-google-sheet-id"
                  onBlur={(e) => handleSave("google_sheet_id", e.target.value)}
                />
              </div>
            </div>
            {getSetting("google_sheet_id") && (
              <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                <span className="h-2 w-2 rounded-full bg-primary inline-block"></span>
                Sheet đã được cấu hình — sẽ tự đồng bộ khi đóng bàn
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Admin() {
  const { currentUser } = useAuth();
  const [, setLocation] = useLocation();

  if (currentUser && currentUser.role !== "quanly") {
    setLocation("/");
    return null;
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 sm:max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight uppercase mb-6">Quản Trị</h1>

        <Tabs defaultValue="tables" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="tables" className="uppercase font-bold tracking-wider text-xs sm:text-sm">Bàn</TabsTrigger>
            <TabsTrigger value="users" className="uppercase font-bold tracking-wider text-xs sm:text-sm">Nhân viên</TabsTrigger>
            <TabsTrigger value="settings" className="uppercase font-bold tracking-wider text-xs sm:text-sm">Cài đặt</TabsTrigger>
          </TabsList>
          <TabsContent value="tables"><TablesManager /></TabsContent>
          <TabsContent value="users"><UsersManager /></TabsContent>
          <TabsContent value="settings"><SettingsManager /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
