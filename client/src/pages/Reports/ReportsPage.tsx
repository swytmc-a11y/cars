import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { ExcelExport } from "@/components/ExcelExport";
import { TrendingUp, Car, FileText, DollarSign } from "lucide-react";

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const FLEET_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
const BRANCH_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

const statusLabels: Record<string, string> = { draft: "مسودة", active: "نشط", completed: "مكتمل", cancelled: "ملغي" };

export default function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery({});
  const { data: contracts, isLoading: contractsLoading } = trpc.contracts.list.useQuery(
    { status: statusFilter !== "all" ? statusFilter : undefined, branchId: branchFilter !== "all" ? Number(branchFilter) : undefined }
  );
  const { data: vehicles, isLoading: vehiclesLoading } = trpc.vehicles.list.useQuery({});
  const { data: branches, isLoading: branchesLoading } = trpc.branches.list.useQuery();
  const { data: monthlyRevenue } = trpc.dashboardStats.monthlyRevenue.useQuery();
  const { data: allPayments } = trpc.export.payments.useQuery({});

  const isLoading = statsLoading || contractsLoading || vehiclesLoading || branchesLoading;

  // ─── Derived stats ────────────────────────────────────────────────────────
  const activeContracts = useMemo(() => contracts?.filter(c => c.status === 'active') ?? [], [contracts]);
  const completedContracts = useMemo(() => contracts?.filter(c => c.status === 'completed') ?? [], [contracts]);
  const totalRevenue = useMemo(() => completedContracts.reduce((sum, c) => sum + Number(c.finalPrice || c.basePrice || 0), 0), [completedContracts]);
  const totalPayments = useMemo(() => (allPayments ?? []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0), [allPayments]);

  // ─── Branch performance data ───────────────────────────────────────────────
  const branchStats = useMemo(() => (branches ?? []).map(b => {
    const branchVehicles = vehicles?.filter(v => v.branchId === b.id) ?? [];
    const branchRented = branchVehicles.filter(v => v.status === 'rented').length;
    const branchContracts = contracts?.filter(c => c.branchId === b.id) ?? [];
    const branchRevenue = branchContracts.filter(c => c.status === 'completed').reduce((sum, c) => sum + Number(c.finalPrice || c.basePrice || 0), 0);
    const occupancy = branchVehicles.length > 0 ? Math.round((branchRented / branchVehicles.length) * 100) : 0;
    return {
      name: b.name,
      city: b.city ?? '-',
      vehicleCount: branchVehicles.length,
      rented: branchRented,
      occupancy,
      contracts: branchContracts.length,
      revenue: branchRevenue,
    };
  }), [branches, vehicles, contracts]);

  // ─── Monthly revenue chart data ────────────────────────────────────────────
  const revenueData = useMemo(() => (monthlyRevenue ?? []).map((item: any) => ({
    name: MONTHS_AR[(item.month - 1) % 12] ?? `${item.month}`,
    الإيرادات: Number(item.revenue),
  })), [monthlyRevenue]);

  // ─── Fleet status pie data ─────────────────────────────────────────────────
  const fleetData = useMemo(() => [
    { name: "متاحة", value: stats?.available ?? 0 },
    { name: "مؤجرة", value: stats?.rented ?? 0 },
    { name: "صيانة", value: stats?.inMaintenance ?? 0 },
    { name: "متأخرة", value: stats?.late ?? 0 },
    { name: "قيد النقل", value: stats?.inTransfer ?? 0 },
  ].filter(d => d.value > 0), [stats]);

  // ─── Contracts export data ─────────────────────────────────────────────────
  const contractsExportData = useMemo(() => (contracts ?? []).map(c => ({
    contractNumber: c.contractNumber,
    status: statusLabels[c.status] ?? c.status,
    startDate: new Date(c.startDate).toLocaleDateString('ar-SA'),
    endDate: new Date(c.endDate).toLocaleDateString('ar-SA'),
    totalDays: c.totalDays ?? '-',
    finalPrice: Number(c.finalPrice ?? c.basePrice ?? 0).toLocaleString('ar-SA'),
  })), [contracts]);

  if (isLoading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">التقارير</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">التقارير</h1>
          <p className="text-sm text-muted-foreground mt-1">تحليل شامل لأداء الأسطول والإيرادات</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="حالة العقد" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="الفرع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفروع</SelectItem>
              {(branches ?? []).map(b => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExcelExport
            data={contractsExportData}
            headers={[
              { key: 'contractNumber', label: 'رقم العقد' },
              { key: 'status', label: 'الحالة' },
              { key: 'startDate', label: 'تاريخ البدء' },
              { key: 'endDate', label: 'تاريخ الانتهاء' },
              { key: 'totalDays', label: 'الأيام' },
              { key: 'finalPrice', label: 'الإجمالي (ر.س)' },
            ]}
            filename="تقرير_العقود"
            sheetName="العقود"
            label="تصدير التقرير"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إيرادات العقود المكتملة</p>
                <p className="text-xl font-bold text-primary">{totalRevenue.toLocaleString('ar-SA')} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي المدفوعات المحصّلة</p>
                <p className="text-xl font-bold text-green-600">{totalPayments.toLocaleString('ar-SA')} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">عقود نشطة</p>
                <p className="text-xl font-bold text-blue-600">{activeContracts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">نسبة الإشغال</p>
                <p className="text-xl font-bold text-amber-600">{stats?.occupancyRate ?? 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الإيرادات الشهرية (آخر 6 أشهر)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={revenueData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'IBM Plex Sans Arabic' }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toLocaleString('ar-SA')} ر.س`, 'الإيرادات']}
                    contentStyle={{ fontFamily: 'IBM Plex Sans Arabic', fontSize: 12, direction: 'rtl' }}
                  />
                  <Line type="monotone" dataKey="الإيرادات" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Fleet Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">توزيع حالات الأسطول</CardTitle>
          </CardHeader>
          <CardContent>
            {fleetData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">لا توجد سيارات</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={fleetData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {fleetData.map((_, i) => <Cell key={i} fill={FLEET_COLORS[i % FLEET_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'سيارة']} contentStyle={{ fontFamily: 'IBM Plex Sans Arabic', fontSize: 12 }} />
                  <Legend formatter={(v) => v} wrapperStyle={{ fontFamily: 'IBM Plex Sans Arabic', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Branch Comparison Chart */}
      {branchStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مقارنة أداء الفروع</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={branchStats} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'IBM Plex Sans Arabic' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ fontFamily: 'IBM Plex Sans Arabic', fontSize: 12, direction: 'rtl' }}
                  formatter={(v: number, name: string) => {
                    if (name === 'إشغال') return [`${v}%`, name];
                    return [v, name];
                  }}
                />
                <Legend wrapperStyle={{ fontFamily: 'IBM Plex Sans Arabic', fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="vehicleCount" name="عدد السيارات" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="rented" name="مؤجرة" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="occupancy" name="إشغال" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Branch Details Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">تفاصيل أداء الفروع</CardTitle>
            <ExcelExport
              data={branchStats}
              headers={[
                { key: 'name', label: 'الفرع' },
                { key: 'city', label: 'المدينة' },
                { key: 'vehicleCount', label: 'عدد السيارات' },
                { key: 'rented', label: 'مؤجرة' },
                { key: 'occupancy', label: 'نسبة الإشغال %' },
                { key: 'contracts', label: 'عدد العقود' },
                { key: 'revenue', label: 'الإيرادات (ر.س)' },
              ]}
              filename="أداء_الفروع"
              sheetName="الفروع"
              label="تصدير الفروع"
            />
          </div>
        </CardHeader>
        <CardContent>
          {branchStats.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">لا توجد فروع</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">الفرع</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">المدينة</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">السيارات</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">مؤجرة</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">الإشغال</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">العقود</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">الإيرادات</th>
                  </tr>
                </thead>
                <tbody>
                  {branchStats.map((b, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 font-medium">{b.name}</td>
                      <td className="py-3 px-3 text-muted-foreground">{b.city}</td>
                      <td className="py-3 px-3 text-center">{b.vehicleCount}</td>
                      <td className="py-3 px-3 text-center">{b.rented}</td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={b.occupancy >= 70 ? "default" : b.occupancy >= 40 ? "secondary" : "outline"}>
                          {b.occupancy}%
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center">{b.contracts}</td>
                      <td className="py-3 px-3 text-left font-medium text-primary">{b.revenue.toLocaleString('ar-SA')} ر.س</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fleet Summary Cards */}
      <Card>
        <CardHeader><CardTitle className="text-base">ملخص حالات الأسطول الكامل</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'متاحة', value: stats?.available ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'مؤجرة', value: stats?.rented ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'صيانة', value: stats?.inMaintenance ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'متأخرة', value: stats?.late ?? 0, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'قيد النقل', value: stats?.inTransfer ?? 0, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'الإجمالي', value: stats?.totalVehicles ?? 0, color: 'text-foreground', bg: 'bg-muted/50' },
            ].map((item, i) => (
              <div key={i} className={`text-center p-3 rounded-lg ${item.bg}`}>
                <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
