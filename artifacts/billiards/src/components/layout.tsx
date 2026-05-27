import { Link, useLocation } from "wouter";
import { LayoutDashboard, History, Settings, LogOut } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { currentUser, logout } = useAuth();

  const isManager = currentUser?.role === "quanly";

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4 shadow-sm">
        <div className="font-mono text-lg font-bold text-primary tracking-tight">
          Q.LÝ BÀN BI-A
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline-block">
            {currentUser?.name}
          </span>
          <Button variant="ghost" size="icon" onClick={logout} title="Đăng xuất">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 pb-16 sm:pb-0 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background sm:hidden flex h-16 items-center">
        <Link href="/" className={`flex-1 flex flex-col items-center justify-center gap-1 ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-medium uppercase">Dashboard</span>
        </Link>
        <Link href="/history" className={`flex-1 flex flex-col items-center justify-center gap-1 ${location === "/history" ? "text-primary" : "text-muted-foreground"}`}>
          <History className="h-5 w-5" />
          <span className="text-[10px] font-medium uppercase">Lịch Sử</span>
        </Link>
        {isManager && (
          <Link href="/admin" className={`flex-1 flex flex-col items-center justify-center gap-1 ${location === "/admin" ? "text-primary" : "text-muted-foreground"}`}>
            <Settings className="h-5 w-5" />
            <span className="text-[10px] font-medium uppercase">Admin</span>
          </Link>
        )}
      </nav>

      {/* Side Nav for Desktop */}
      <nav className="hidden sm:flex fixed top-14 bottom-0 left-0 w-64 flex-col border-r border-border bg-background p-4 gap-2">
        <Link href="/" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${location === "/" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"}`}>
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </Link>
        <Link href="/history" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${location === "/history" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"}`}>
          <History className="h-5 w-5" />
          <span>Lịch Sử</span>
        </Link>
        {isManager && (
          <Link href="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${location === "/admin" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"}`}>
            <Settings className="h-5 w-5" />
            <span>Admin</span>
          </Link>
        )}
      </nav>

      <div className="hidden sm:block fixed top-14 bottom-0 left-64 right-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
