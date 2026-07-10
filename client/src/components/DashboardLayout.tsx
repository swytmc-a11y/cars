import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, Car, Users, CalendarCheck, FileText,
  ArrowLeftRight, Wrench, CreditCard, Bell, Settings,
  BarChart3, LogOut, PanelRight, ClipboardList, UserCircle, UserCog, MapPin, Download,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { Badge } from "./ui/badge";
import GlobalSearch from "./GlobalSearch";
import QuickContractDialog from "./QuickContractDialog";
import { Plus } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const menuItems = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "/" },
  { icon: Car, label: "السيارات", path: "/vehicles" },
  { icon: MapPin, label: "تتبع السيارات", path: "/tracking" },
  { icon: Users, label: "العملاء", path: "/customers" },
  { icon: CalendarCheck, label: "الحجوزات", path: "/reservations" },
  { icon: FileText, label: "العقود", path: "/contracts" },
  { icon: CreditCard, label: "المدفوعات", path: "/payments" },
  { icon: ArrowLeftRight, label: "النقل", path: "/transfers" },
  { icon: Wrench, label: "الصيانة", path: "/maintenance" },
  { icon: BarChart3, label: "التقارير", path: "/reports" },
  { icon: Bell, label: "التنبيهات", path: "/alerts" },
  { icon: UserCog, label: "إدارة الموظفين", path: "/staff", ownerOnly: true },
  { icon: ClipboardList, label: "سجل التدقيق", path: "/audit-log", ownerOnly: true },
  { icon: Settings, label: "الإعدادات", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    if (!loading && !user) {
      window.location.replace('/login');
    }
    // Redirect inactive accounts to pending approval page
    if (!loading && user && !(user as any).isActive) {
      window.location.replace('/pending-approval');
    }
  }, [loading, user]);

  if (loading || !user) {
    return <DashboardLayoutSkeleton />;
  }

  // Block inactive users
  if (!(user as any).isActive) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const { data: alertsData } = trpc.alerts.list.useQuery({ isRead: false }, {
    refetchInterval: 30000,
  });
  const unreadCount = alertsData?.length ?? 0;
  const [quickContractOpen, setQuickContractOpen] = useState(false);
  const { canInstall, promptInstall } = useInstallPrompt();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarRight = sidebarRef.current?.getBoundingClientRect().right ?? 0;
      const newWidth = sidebarRight - e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-l-0 border-r" side="right" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center border-b">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none shrink-0"
                aria-label="تبديل القائمة"
              >
                <PanelRight className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <Car className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-bold tracking-tight truncate text-sm">إدارة التأجير</span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            <SidebarMenu className="px-2">
              {menuItems.filter(item => !item.ownerOnly || user?.role === 'owner').map(item => {
                const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                      <span className="flex-1">{item.label}</span>
                      {item.path === "/alerts" && unreadCount > 0 && !isCollapsed && (
                        <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1.5">
                          {unreadCount}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t space-y-2">
            {canInstall && (
              <Button variant="outline" size="sm" className="w-full gap-2 group-data-[collapsible=icon]:hidden" onClick={promptInstall}>
                <Download className="h-4 w-4" />
                تثبيت التطبيق
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-right group-data-[collapsible=icon]:justify-center focus:outline-none">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0)?.toUpperCase() || "م"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">{user?.name || "مستخدم"}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1">{user?.email || ""}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <div className="px-2 py-1.5 border-b mb-1">
                  <p className="text-xs font-medium truncate">{user?.name || "مستخدم"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                </div>
                <DropdownMenuItem onClick={() => setLocation('/profile')} className="cursor-pointer gap-2">
                  <UserCircle className="h-4 w-4" />
                  <span>الملف الشخصي</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Desktop header with search and quick actions */}
        {!isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40 gap-3">
            <GlobalSearch />
            <Button size="sm" onClick={() => setQuickContractOpen(true)} className="shrink-0 gap-1.5">
              <Plus className="h-4 w-4" />
              عقد سريع
            </Button>
          </div>
        )}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur sticky top-0 z-40 gap-2">
            <SidebarTrigger className="h-9 w-9 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <GlobalSearch />
            </div>
            <Button size="sm" variant="outline" onClick={() => setQuickContractOpen(true)} className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <QuickContractDialog open={quickContractOpen} onClose={() => setQuickContractOpen(false)} />
      </SidebarInset>
    </>
  );
}
