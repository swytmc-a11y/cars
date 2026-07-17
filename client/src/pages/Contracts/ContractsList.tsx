import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ExcelExport } from "@/components/ExcelExport";

const statusLabels: Record<string, string> = { draft: "مسودة", active: "نشط", completed: "مكتمل", cancelled: "ملغي" };
const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = { draft: "outline", active: "default", completed: "secondary", cancelled: "destructive" };

export default function ContractsList() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: contracts, isLoading } = trpc.contracts.list.useQuery({ status: statusFilter !== "all" ? statusFilter : undefined });
  const { data: vehicles } = trpc.vehicles.list.useQuery({});
  const { data: customers } = trpc.customers.list.useQuery({});

  const getVehicle = (id: number) => vehicles?.find(v => v.id === id);
  const getCustomer = (id: number) => customers?.find(c => c.id === id);

  // Prepare export data by enriching contracts with customer/vehicle names
  const exportData = (contracts ?? []).map(c => ({
    contractNumber: c.contractNumber,
    status: statusLabels[c.status] ?? c.status,
    customerName: getCustomer(c.customerId)?.name ?? '-',
    vehicleName: (() => { const v = getVehicle(c.vehicleId); return v ? `${v.brand} ${v.model} (${v.plateNumber})` : '-'; })(),
    startDate: new Date(c.startDate).toLocaleDateString('ar-SA'),
    endDate: new Date(c.endDate).toLocaleDateString('ar-SA'),
    totalDays: c.totalDays ?? '-',
    dailyRate: c.dailyRate ?? '-',
    basePrice: Number(c.basePrice ?? 0).toLocaleString('ar-SA'),
    discount: Number(c.discount ?? 0).toLocaleString('ar-SA'),
    finalPrice: Number(c.finalPrice ?? c.basePrice ?? 0).toLocaleString('ar-SA'),
    notes: c.notes ?? '',
  }));

  const exportHeaders: { key: keyof typeof exportData[0]; label: string }[] = [
    { key: 'contractNumber', label: 'رقم العقد' },
    { key: 'status', label: 'الحالة' },
    { key: 'customerName', label: 'العميل' },
    { key: 'vehicleName', label: 'السيارة' },
    { key: 'startDate', label: 'تاريخ البدء' },
    { key: 'endDate', label: 'تاريخ الانتهاء' },
    { key: 'totalDays', label: 'عدد الأيام' },
    { key: 'dailyRate', label: 'السعر اليومي' },
    { key: 'basePrice', label: 'السعر الأساسي' },
    { key: 'discount', label: 'الخصم' },
    { key: 'finalPrice', label: 'السعر النهائي' },
    { key: 'notes', label: 'ملاحظات' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">العقود</h1>
        <div className="flex items-center gap-2">
          <ExcelExport
            data={exportData}
            headers={exportHeaders}
            filename="عقود"
            sheetName="العقود"
            disabled={isLoading}
          />
          <Button onClick={() => setLocation("/contracts/new")}><Plus className="h-4 w-4 ml-2" />عقد جديد</Button>
        </div>
      </div>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">الكل</SelectItem>
          <SelectItem value="active">نشط</SelectItem>
          <SelectItem value="completed">مكتمل</SelectItem>
          <SelectItem value="cancelled">ملغي</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {contracts?.map(c => {
            const vehicle = getVehicle(c.vehicleId);
            const customer = getCustomer(c.customerId);
            return (
              <Card key={c.id} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/20" onClick={() => setLocation(`/contracts/${c.id}`)}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.contractNumber}</span>
                      <Badge variant={statusVariants[c.status]}>{statusLabels[c.status]}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 flex gap-4 flex-wrap">
                      <span>العميل: {customer?.name || '-'}</span>
                      <span>السيارة: {vehicle ? `${vehicle.brand} ${vehicle.model}` : '-'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-4">
                      <span>{new Date(c.startDate).toLocaleDateString('ar-SA')} - {new Date(c.endDate).toLocaleDateString('ar-SA')}</span>
                      <span className="font-medium text-foreground">{Number(c.finalPrice || c.basePrice).toLocaleString('ar-SA')} ر.س</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {contracts?.length === 0 && <div className="text-center py-12 text-muted-foreground">لا توجد عقود</div>}
        </div>
      )}
    </div>
  );
}
