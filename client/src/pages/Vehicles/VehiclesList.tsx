import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Car } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const statusLabels: Record<string, string> = {
  available: "متاحة",
  reserved: "محجوزة",
  rented: "مؤجرة",
  late: "متأخرة",
  maintenance: "صيانة",
  in_transfer: "قيد النقل",
};

const statusClasses: Record<string, string> = {
  available: "status-available",
  reserved: "status-reserved",
  rented: "status-rented",
  late: "status-late",
  maintenance: "status-maintenance",
  in_transfer: "status-transfer",
};

const categoryLabels: Record<string, string> = {
  economy: "اقتصادية",
  family: "عائلية",
  luxury: "فاخرة",
};

export default function VehiclesList() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: vehicles, isLoading } = trpc.vehicles.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">السيارات</h1>
        <Button onClick={() => setLocation("/vehicles/new")}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة سيارة
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="available">متاحة</SelectItem>
            <SelectItem value="rented">مؤجرة</SelectItem>
            <SelectItem value="reserved">محجوزة</SelectItem>
            <SelectItem value="maintenance">صيانة</SelectItem>
            <SelectItem value="late">متأخرة</SelectItem>
            <SelectItem value="in_transfer">قيد النقل</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الفئة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفئات</SelectItem>
            <SelectItem value="economy">اقتصادية</SelectItem>
            <SelectItem value="family">عائلية</SelectItem>
            <SelectItem value="luxury">فاخرة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles?.map((vehicle) => (
            <Card
              key={vehicle.id}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/20"
              onClick={() => setLocation(`/vehicles/${vehicle.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    {vehicle.brand} {vehicle.model}
                  </CardTitle>
                  <Badge className={`${statusClasses[vehicle.status]} border-0 text-xs`}>
                    {statusLabels[vehicle.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">رقم اللوحة</span>
                  <span className="font-medium">{vehicle.plateNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">السنة</span>
                  <span>{vehicle.year}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الفئة</span>
                  <span>{categoryLabels[vehicle.category]}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">السعر اليومي</span>
                  <span className="font-bold text-primary">{Number(vehicle.dailyRate).toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">العداد</span>
                  <span>{vehicle.currentMileage.toLocaleString('ar-SA')} كم</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {vehicles?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              لا توجد سيارات مطابقة للبحث
            </div>
          )}
        </div>
      )}
    </div>
  );
}
