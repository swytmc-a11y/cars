import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Car, Users, FileText, Bell, TrendingUp, AlertTriangle, Wrench,
  ArrowLeftRight, DollarSign, CalendarCheck
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Link } from "wouter";

const FLEET_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
const FLEET_LABELS = ["متاحة", "مؤجرة", "صيانة", "متأخرة", "قيد النقل"];

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery({});
  const { data: monthlyRevenue, isLoading: revenueLoading } = trpc.dashboardStats.monthlyRevenue.useQuery();
  const { data: alerts = [] } = trpc.alerts.list.useQuery({ isRead: false });

  const isLoading = statsLoading || revenueLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  // Grouped for hierarchy: fleet status → revenue/contracts → operational flags
  const statGroups = [
    {
      label: "الأسطول",
      cards: [
        { title: "إجمالي السيارات", value: stats?.totalVehicles ?? 0, icon: Car, color: "text-primary", bg: "bg-primary/10", href: "/vehicles" },
        { title: "متاحة للإيجار", value: stats?.available ?? 0, icon: Car, color: "text-emerald-600", bg: "bg-emerald-50", href: "/vehicles" },
        { title: "في الصيانة", value: stats?.inMaintenance ?? 0, icon: Wrench, color: "text-amber-600", bg: "bg-amber-50", href: "/maintenance" },
        { title: "قيد النقل", value: stats?.inTransfer ?? 0, icon: ArrowLeftRight, color: "text-purple-600", bg: "bg-purple-50", href: "/transfers" },
      ],
    },
    {
      label: "الإيرادات والعقود",
      cards: [
        { title: "عقود نشطة", value: stats?.activeContracts ?? 0, icon: FileText, color: "text-primary", bg: "bg-primary/10", href: "/contracts" },
        { title: "نسبة الإشغال", value: `${stats?.occupancyRate ?? 0}%`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", href: "/reports" },
      ],
    },
    {
      label: "يحتاج انتباهك",
      cards: [
        { title: "متأخرة الإرجاع", value: stats?.late ?? 0, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", href: "/contracts" },
        { title: "تنبيهات غير مقروءة", value: alerts.length, icon: Bell, color: "text-red-600", bg: "bg-red-50", href: "/alerts" },
      ],
    },
  ];

  // Prepare fleet pie chart data
  const fleetData = [
    { name: "متاحة", value: stats?.available ?? 0 },
    { name: "مؤجرة", value: stats?.rented ?? 0 },
    { name: "صيانة", value: stats?.inMaintenance ?? 0 },
    { name: "متأخرة", value: stats?.late ?? 0 },
    { name: "قيد النقل", value: stats?.inTransfer ?? 0 },
  ].filter(d => d.value > 0);

  // Prepare monthly revenue bar chart data
  const revenueData = (monthlyRevenue ?? []).map((item: any) => ({
    name: MONTHS_AR[item.month - 1] ?? `${item.month}`,
    الإيرادات: Number(item.revenue),
  }));

  const totalRevenue = revenueData.reduce((sum: number, d: { الإيرادات: number }) => sum + d.الإيرادات, 0);

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">لوحة التحكم</h1>
          <p className="text-muted-foreground text-sm mt-1">نظرة عامة على أداء الأسطول</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-soft-sm">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">إيرادات هذا الشهر</p>
            <p className="text-lg font-semibold text-primary tabular-nums">
              {(stats?.monthlyRevenue ?? 0).toLocaleString("ar-SA")} ر.س
            </p>
          </div>
        </div>
      </div>

      {/* Stats Groups — grouped by theme for clearer hierarchy */}
      <div className="space-y-6">
        {statGroups.map((group) => (
          <div key={group.label} className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground px-0.5">{group.label}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {group.cards.map((card) => (
                <Link key={card.title} href={card.href}>
                  <Card className="hover:shadow-soft-md transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                      <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{card.title}</CardTitle>
                      <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
                        <card.icon className={`h-4 w-4 ${card.color}`} strokeWidth={1.75} />
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="text-2xl font-semibold tabular-nums">{card.value}</div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                الإيرادات الشهرية
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                الإجمالي: {totalRevenue.toLocaleString("ar-SA")} ر.س
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                لا توجد بيانات إيرادات بعد
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={revenueData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString("ar-SA")} ر.س`, "الإيرادات"]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      direction: "rtl",
                    }}
                  />
                  <Bar dataKey="الإيرادات" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Fleet Status Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" />
              حالة الأسطول
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fleetData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                لا توجد سيارات بعد
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={fleetData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {fleetData.map((_, index) => (
                      <Cell key={index} fill={FLEET_COLORS[index % FLEET_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      direction: "rtl",
                    }}
                  />
                  <Legend
                    formatter={(value) => <span style={{ fontSize: 11, color: "hsl(var(--foreground))" }}>{value}</span>}
                    iconSize={10}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-500" />
                تنبيهات مهمة
              </CardTitle>
              <Link href="/alerts">
                <span className="text-xs text-primary hover:underline cursor-pointer">عرض الكل</span>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert: any) => (
                <div key={alert.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    alert.severity === "critical" ? "bg-red-500" :
                    alert.severity === "high" ? "bg-orange-500" :
                    alert.severity === "medium" ? "bg-yellow-500" : "bg-blue-500"
                  }`} />
                  <p className="text-sm flex-1">{alert.message}</p>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(alert.createdAt).toLocaleDateString("ar-SA")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
