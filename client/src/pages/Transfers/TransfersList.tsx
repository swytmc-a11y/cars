import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeftRight } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const statusLabels: Record<string, string> = { initiated: "بدأ", in_transit: "قيد النقل", received: "تم الاستلام" };
const statusVariants: Record<string, "default" | "secondary" | "outline"> = { initiated: "outline", in_transit: "default", received: "secondary" };

export default function TransfersList() {
  const [, setLocation] = useLocation();
  const { data: transfers, isLoading } = trpc.transfers.list.useQuery({});
  const { data: vehicles } = trpc.vehicles.list.useQuery({});
  const { data: branches } = trpc.branches.list.useQuery();
  const utils = trpc.useUtils();

  const receiveMutation = trpc.transfers.receive.useMutation({
    onSuccess: () => { toast.success("تم استلام السيارة"); utils.transfers.list.invalidate(); utils.vehicles.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const getVehicle = (id: number) => vehicles?.find(v => v.id === id);
  const getBranch = (id: number) => branches?.find(b => b.id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">النقل بين الفروع</h1>
        <Button onClick={() => setLocation("/transfers/new")}><Plus className="h-4 w-4 ml-2" />طلب نقل</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {transfers?.map(t => {
            const vehicle = getVehicle(t.vehicleId);
            const fromBranch = getBranch(t.fromBranchId);
            const toBranch = getBranch(t.toBranchId);
            return (
              <Card key={t.id} className="hover:shadow-md transition-all">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ArrowLeftRight className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{vehicle ? `${vehicle.brand} ${vehicle.model}` : '-'}</span>
                      <Badge variant={statusVariants[t.status]}>{statusLabels[t.status]}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      من: {fromBranch?.name || '-'} → إلى: {toBranch?.name || '-'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(t.initiatedAt).toLocaleDateString('ar-SA')}</div>
                  </div>
                  {t.status !== 'received' && (
                    <Button size="sm" variant="outline" onClick={() => receiveMutation.mutate({ id: t.id, vehicleId: t.vehicleId, toBranchId: t.toBranchId })} disabled={receiveMutation.isPending}>
                      تأكيد الاستلام
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {transfers?.length === 0 && <div className="text-center py-12 text-muted-foreground">لا توجد عمليات نقل</div>}
        </div>
      )}
    </div>
  );
}
