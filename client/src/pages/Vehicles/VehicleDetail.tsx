import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Edit, Trash2, Plus, TrendingUp, Percent, Calendar } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";

const statusLabels: Record<string, string> = {
  available: "متاحة", reserved: "محجوزة", rented: "مؤجرة",
  late: "متأخرة", maintenance: "صيانة", in_transfer: "قيد النقل",
};
const statusClasses: Record<string, string> = {
  available: "status-available", reserved: "status-reserved", rented: "status-rented",
  late: "status-late", maintenance: "status-maintenance", in_transfer: "status-transfer",
};
const categoryLabels: Record<string, string> = { economy: "اقتصادية", family: "عائلية", luxury: "فاخرة" };

export default function VehicleDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const vehicleId = Number(params.id);
  const { data, isLoading } = trpc.vehicles.getById.useQuery({ id: vehicleId });
  const { data: stats } = trpc.vehicles.getStats.useQuery({ id: vehicleId });
  const utils = trpc.useUtils();

  const deleteVehicle = trpc.vehicles.delete.useMutation({
    onSuccess: () => { toast.success("تم حذف السيارة"); setLocation("/vehicles"); },
    onError: (e) => toast.error(e.message),
  });

  const [docOpen, setDocOpen] = useState(false);
  const [docForm, setDocForm] = useState({ type: "insurance" as "insurance" | "registration" | "inspection", expiryDate: "", notes: "" });

  const createDoc = trpc.vehicleDocuments.create.useMutation({
    onSuccess: () => { toast.success("تم إضافة الوثيقة"); utils.vehicles.getById.invalidate({ id: vehicleId }); setDocOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
  if (!data) return <div className="text-center py-12 text-muted-foreground">السيارة غير موجودة</div>;

  const { vehicle, history, documents, maintenance } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/vehicles")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{vehicle.brand} {vehicle.model}</h1>
        <Badge className={`${statusClasses[vehicle.status]} border-0`}>{statusLabels[vehicle.status]}</Badge>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => setLocation(`/vehicles/${vehicle.id}/edit`)}>
          <Edit className="h-4 w-4 ml-2" />تعديل
        </Button>
        <Button variant="destructive" size="sm" onClick={() => { if (confirm("هل أنت متأكد من حذف هذه السيارة؟")) deleteVehicle.mutate({ id: vehicle.id }); }}>
          <Trash2 className="h-4 w-4 ml-2" />حذف
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">رقم اللوحة</div><div className="text-lg font-bold mt-1">{vehicle.plateNumber}</div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3"><TrendingUp className="h-5 w-5 text-green-600" /><div><div className="text-sm text-muted-foreground">إجمالي الإيرادات</div><div className="text-lg font-bold mt-1 text-green-600">{(stats?.totalRevenue || 0).toLocaleString('ar-SA')} ر.س</div></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3"><Percent className="h-5 w-5 text-blue-600" /><div><div className="text-sm text-muted-foreground">نسبة الإشغال</div><div className="text-lg font-bold mt-1 text-blue-600">{stats?.occupancyRate || 0}%</div></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3"><Calendar className="h-5 w-5 text-purple-600" /><div><div className="text-sm text-muted-foreground">عدد العقود</div><div className="text-lg font-bold mt-1">{stats?.totalContracts || 0}</div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="info">المعلومات</TabsTrigger>
          <TabsTrigger value="history">السجل</TabsTrigger>
          <TabsTrigger value="documents">الوثائق</TabsTrigger>
          <TabsTrigger value="maintenance">الصيانة</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><div className="text-sm text-muted-foreground">الماركة</div><div className="font-medium">{vehicle.brand}</div></div>
              <div><div className="text-sm text-muted-foreground">الموديل</div><div className="font-medium">{vehicle.model}</div></div>
              <div><div className="text-sm text-muted-foreground">السنة</div><div className="font-medium">{vehicle.year}</div></div>
              <div><div className="text-sm text-muted-foreground">اللون</div><div className="font-medium">{vehicle.color || '-'}</div></div>
              <div><div className="text-sm text-muted-foreground">العداد</div><div className="font-medium">{vehicle.currentMileage.toLocaleString('ar-SA')} كم</div></div>
              <div><div className="text-sm text-muted-foreground">الفئة</div><div className="font-medium">{categoryLabels[vehicle.category]}</div></div>
              <div><div className="text-sm text-muted-foreground">السعر اليومي</div><div className="font-medium text-primary">{Number(vehicle.dailyRate).toLocaleString('ar-SA')} ر.س</div></div>
              <div><div className="text-sm text-muted-foreground">السعر الأسبوعي</div><div className="font-medium">{vehicle.weeklyRate ? `${Number(vehicle.weeklyRate).toLocaleString('ar-SA')} ر.س` : '-'}</div></div>
              <div><div className="text-sm text-muted-foreground">السعر الشهري</div><div className="font-medium">{vehicle.monthlyRate ? `${Number(vehicle.monthlyRate).toLocaleString('ar-SA')} ر.س` : '-'}</div></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader><CardTitle>سجل السيارة</CardTitle></CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">لا يوجد سجل</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 border-b pb-3 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{h.description}</div>
                        <div className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleDateString('ar-SA')} - {h.eventType}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>وثائق السيارة</CardTitle>
              <Dialog open={docOpen} onOpenChange={setDocOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 ml-2" />إضافة وثيقة</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>إضافة وثيقة جديدة</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>نوع الوثيقة</Label>
                      <Select value={docForm.type} onValueChange={(v) => setDocForm(f => ({ ...f, type: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="insurance">تأمين</SelectItem>
                          <SelectItem value="registration">ترخيص</SelectItem>
                          <SelectItem value="inspection">فحص</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ الانتهاء</Label>
                      <Input type="date" value={docForm.expiryDate} onChange={e => setDocForm(f => ({ ...f, expiryDate: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>ملاحظات</Label>
                      <Input value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <Button className="w-full" onClick={() => createDoc.mutate({ vehicleId, ...docForm })} disabled={createDoc.isPending}>
                      {createDoc.isPending ? "جاري الحفظ..." : "إضافة"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">لا توجد وثائق</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
                    const isExpiringSoon = doc.expiryDate && !isExpired && new Date(doc.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    return (
                      <div key={doc.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div>
                          <div className="font-medium text-sm">{doc.type === 'insurance' ? 'تأمين' : doc.type === 'registration' ? 'ترخيص' : 'فحص'}</div>
                          {doc.expiryDate && <div className="text-xs text-muted-foreground">ينتهي: {new Date(doc.expiryDate).toLocaleDateString('ar-SA')}</div>}
                        </div>
                        {isExpired && <Badge variant="destructive">منتهية</Badge>}
                        {isExpiringSoon && <Badge className="bg-yellow-100 text-yellow-800">تنتهي قريباً</Badge>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          <Card>
            <CardHeader><CardTitle>سجل الصيانة</CardTitle></CardHeader>
            <CardContent>
              {maintenance.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">لا يوجد سجل صيانة</p>
              ) : (
                <div className="space-y-3">
                  {maintenance.map((m) => (
                    <div key={m.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <div className="font-medium text-sm">{m.reason}</div>
                        <div className="text-xs text-muted-foreground">{new Date(m.startDate).toLocaleDateString('ar-SA')}</div>
                      </div>
                      <div className="text-sm">{m.cost ? `${Number(m.cost).toLocaleString('ar-SA')} ر.س` : '-'}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
