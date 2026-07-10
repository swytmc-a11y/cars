import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const statusLabels: Record<string, string> = { scheduled: "مجدولة", in_progress: "جارية", completed: "مكتملة" };
const typeLabels: Record<string, string> = { scheduled: "دورية", unscheduled: "طارئة", preventive: "وقائية" };

export default function MaintenanceList() {
  const [, setLocation] = useLocation();
  const { data: maintenanceRecords, isLoading } = trpc.maintenance.list.useQuery({});
  const { data: vehicles } = trpc.vehicles.list.useQuery({});
  const utils = trpc.useUtils();

  const completeMutation = trpc.maintenance.complete.useMutation({
    onSuccess: () => { toast.success("تم إكمال الصيانة"); utils.maintenance.list.invalidate(); utils.vehicles.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const getVehicle = (id: number) => vehicles?.find(v => v.id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الصيانة</h1>
        <Button onClick={() => setLocation("/maintenance/new")}><Plus className="h-4 w-4 ml-2" />جدولة صيانة</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {maintenanceRecords?.map(m => {
            const vehicle = getVehicle(m.vehicleId);
            return (
              <Card key={m.id} className="hover:shadow-md transition-all">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{vehicle ? `${vehicle.brand} ${vehicle.model}` : '-'}</span>
                      <Badge variant="outline">{typeLabels[m.type]}</Badge>
                      <Badge variant={m.status === 'completed' ? 'secondary' : m.status === 'in_progress' ? 'default' : 'outline'}>{statusLabels[m.status]}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{m.reason}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-4">
                      <span>بداية: {new Date(m.startDate).toLocaleDateString('ar-SA')}</span>
                      {m.cost && <span>التكلفة: {Number(m.cost).toLocaleString('ar-SA')} ر.س</span>}
                    </div>
                  </div>
                  {m.status !== 'completed' && (
                    <Button size="sm" variant="outline" onClick={() => completeMutation.mutate({ id: m.id, vehicleId: m.vehicleId })} disabled={completeMutation.isPending}>
                      إكمال
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {maintenanceRecords?.length === 0 && <div className="text-center py-12 text-muted-foreground">لا توجد سجلات صيانة</div>}
        </div>
      )}
    </div>
  );
}
