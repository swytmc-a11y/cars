import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { useState, useMemo } from "react";

const entityLabels: Record<string, string> = {
  vehicle: "سيارة",
  customer: "عميل",
  contract: "عقد",
  reservation: "حجز",
  payment: "دفعة",
  handover: "تسليم",
  return: "استلام",
  transfer: "نقل",
  maintenance: "صيانة",
  branch: "فرع",
  user: "مستخدم",
  vehicleDocument: "وثيقة",
};

const actionLabels: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
};

const actionIcons: Record<string, any> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

const actionColors: Record<string, string> = {
  create: "text-green-600",
  update: "text-blue-600",
  delete: "text-red-600",
};

export default function AuditLogPage() {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const { data: logs, isLoading } = trpc.auditLogs.list.useQuery(
    entityFilter !== "all" ? { entityType: entityFilter } : undefined
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">سجل التدقيق</h1>
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          سجل التدقيق
        </h1>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="فلترة حسب النوع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="vehicle">السيارات</SelectItem>
            <SelectItem value="customer">العملاء</SelectItem>
            <SelectItem value="contract">العقود</SelectItem>
            <SelectItem value="reservation">الحجوزات</SelectItem>
            <SelectItem value="payment">المدفوعات</SelectItem>
            <SelectItem value="transfer">النقل</SelectItem>
            <SelectItem value="maintenance">الصيانة</SelectItem>
            <SelectItem value="branch">الفروع</SelectItem>
            <SelectItem value="user">المستخدمين</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-2">
          {logs?.map((log: any) => {
            const ActionIcon = actionIcons[log.action] || Eye;
            const colorClass = actionColors[log.action] || "text-gray-600";
            return (
              <Card key={log.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full bg-muted ${colorClass}`}>
                        <ActionIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {actionLabels[log.action] || log.action}{" "}
                          {entityLabels[log.entityType] || log.entityType}
                          {log.entityId ? ` #${log.entityId}` : ""}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          المستخدم #{log.userId} • {new Date(log.createdAt).toLocaleString("ar-SA")}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {entityLabels[log.entityType] || log.entityType}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {(!logs || logs.length === 0) && (
            <div className="text-center text-muted-foreground py-12">
              لا توجد سجلات تدقيق
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
