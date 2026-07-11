import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function AlertsPage() {
  const { data: alerts, isLoading } = trpc.alerts.list.useQuery({});
  const utils = trpc.useUtils();

  const markReadMutation = trpc.alerts.markAsRead.useMutation({
    onSuccess: () => { utils.alerts.list.invalidate(); },
  });
  const markAllMutation = trpc.alerts.markAllAsRead.useMutation({
    onSuccess: () => { toast.success("تم تعليم الكل كمقروء"); utils.alerts.list.invalidate(); },
  });

  const unreadCount = alerts?.filter(a => !a.isRead).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">التنبيهات</h1>
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount} غير مقروء</Badge>}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate({})}>
            <CheckCheck className="h-4 w-4 ml-2" />تعليم الكل كمقروء
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {alerts?.map(alert => (
            <Card key={alert.id} className={`transition-all ${!alert.isRead ? 'border-primary/30 bg-primary/5' : ''}`}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!alert.isRead ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Bell className={`h-5 w-5 ${!alert.isRead ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${!alert.isRead ? '' : 'text-muted-foreground'}`}>{alert.title}</span>
                    <Badge variant="outline" className="text-xs">{alert.type}</Badge>
                  </div>
                  {alert.message && <div className="text-sm text-muted-foreground mt-1">{alert.message}</div>}
                  <div className="text-xs text-muted-foreground mt-1">{new Date(alert.createdAt).toLocaleString('ar-SA')}</div>
                </div>
                {!alert.isRead && (
                  <Button size="sm" variant="ghost" onClick={() => markReadMutation.mutate({ id: alert.id })}>
                    قراءة
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {alerts?.length === 0 && <div className="text-center py-12 text-muted-foreground">لا توجد تنبيهات</div>}
        </div>
      )}
    </div>
  );
}
