import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Eye, Edit, CheckCircle, XCircle, Loader2, CalendarCheck, Search } from "lucide-react";
import { Link } from "wouter";

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  cancelled: "ملغي",
  completed: "مكتمل",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
};

type Reservation = {
  id: number;
  customerId: number | null;
  vehicleId: number | null;
  startDate: Date;
  endDate: Date;
  status: string;
  notes: string | null;
  createdAt: Date;
};

export default function ReservationsList() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewReservation, setViewReservation] = useState<Reservation | null>(null);
  const [editReservation, setEditReservation] = useState<Reservation | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ startDate: "", endDate: "", notes: "" });

  const { data: reservations = [], isLoading } = trpc.reservations.list.useQuery(
    filterStatus !== "all" ? { status: filterStatus } : undefined
  );
  const { data: customers = [] } = trpc.customers.list.useQuery({});
  const { data: vehicles = [] } = trpc.vehicles.list.useQuery({});

  const updateReservation = trpc.reservations.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الحجز بنجاح");
      utils.reservations.list.invalidate();
      setEditReservation(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteReservation = trpc.reservations.delete.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الحجز بنجاح");
      utils.reservations.list.invalidate();
      setCancelId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const getCustomerName = (id: number | null) => customers.find(c => c.id === id)?.name ?? "—";
  const getVehicleName = (id: number | null) => {
    const v = vehicles.find(v => v.id === id);
    return v ? `${v.brand} ${v.model} (${v.plateNumber})` : "—";
  };

  const filtered = reservations.filter(r => {
    const customerName = getCustomerName(r.customerId);
    const vehicleName = getVehicleName(r.vehicleId);
    return (
      customerName.includes(search) ||
      vehicleName.includes(search) ||
      String(r.id).includes(search)
    );
  });

  const openEdit = (r: Reservation) => {
    setEditReservation(r);
    setEditForm({
      startDate: new Date(r.startDate).toISOString().split("T")[0],
      endDate: new Date(r.endDate).toISOString().split("T")[0],
      notes: r.notes ?? "",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الحجوزات</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة جميع حجوزات السيارات</p>
        </div>
        <Link href="/reservations/new">
          <Button className="gap-2"><Plus className="w-4 h-4" />حجز جديد</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث بالعميل أو السيارة..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="كل الحالات" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="confirmed">مؤكد</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" />قائمة الحجوزات ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>لا توجد حجوزات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">السيارة</TableHead>
                    <TableHead className="text-right">البداية</TableHead>
                    <TableHead className="text-right">النهاية</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.id}</TableCell>
                      <TableCell className="font-medium">{getCustomerName(r.customerId)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getVehicleName(r.vehicleId)}</TableCell>
                      <TableCell className="text-sm">{new Date(r.startDate).toLocaleDateString("ar-SA")}</TableCell>
                      <TableCell className="text-sm">{new Date(r.endDate).toLocaleDateString("ar-SA")}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${statusColors[r.status] ?? ""}`}>{statusLabels[r.status] ?? r.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="معاينة" onClick={() => setViewReservation(r)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {(r.status === "pending" || r.status === "confirmed") && (
                            <>
                              {r.status === "pending" && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700" title="تأكيد" onClick={() => updateReservation.mutate({ id: r.id, status: "confirmed" })} disabled={updateReservation.isPending}>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="تعديل" onClick={() => openEdit(r)}>
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="إلغاء" onClick={() => setCancelId(r.id)}>
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewReservation} onOpenChange={() => setViewReservation(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>تفاصيل الحجز #{viewReservation?.id}</DialogTitle></DialogHeader>
          {viewReservation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">العميل</Label><p className="font-medium">{getCustomerName(viewReservation.customerId)}</p></div>
                <div><Label className="text-xs text-muted-foreground">الحالة</Label><div className="mt-1"><Badge className={`text-xs border ${statusColors[viewReservation.status] ?? ""}`}>{statusLabels[viewReservation.status]}</Badge></div></div>
                <div className="col-span-2"><Label className="text-xs text-muted-foreground">السيارة</Label><p className="font-medium">{getVehicleName(viewReservation.vehicleId)}</p></div>
                <div><Label className="text-xs text-muted-foreground">تاريخ البداية</Label><p>{new Date(viewReservation.startDate).toLocaleDateString("ar-SA")}</p></div>
                <div><Label className="text-xs text-muted-foreground">تاريخ النهاية</Label><p>{new Date(viewReservation.endDate).toLocaleDateString("ar-SA")}</p></div>
                <div><Label className="text-xs text-muted-foreground">عدد الأيام</Label><p>{Math.ceil((new Date(viewReservation.endDate).getTime() - new Date(viewReservation.startDate).getTime()) / 86400000)} يوم</p></div>
                <div><Label className="text-xs text-muted-foreground">تاريخ الإنشاء</Label><p>{new Date(viewReservation.createdAt).toLocaleDateString("ar-SA")}</p></div>
                {viewReservation.notes && <div className="col-span-2"><Label className="text-xs text-muted-foreground">ملاحظات</Label><p className="text-sm bg-muted p-2 rounded mt-1">{viewReservation.notes}</p></div>}
              </div>
              {viewReservation.status === "confirmed" && (
                <Link href={`/contracts/new`}>
                  <Button className="w-full gap-2" onClick={() => setViewReservation(null)}>
                    <CheckCircle className="w-4 h-4" />تحويل إلى عقد
                  </Button>
                </Link>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editReservation} onOpenChange={() => setEditReservation(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>تعديل الحجز #{editReservation?.id}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>تاريخ البداية</Label><Input type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} dir="ltr" /></div>
              <div className="space-y-2"><Label>تاريخ النهاية</Label><Input type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} dir="ltr" /></div>
            </div>
            <div className="space-y-2"><Label>ملاحظات</Label><Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات إضافية..." rows={3} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditReservation(null)}>إلغاء</Button>
            <Button onClick={() => editReservation && updateReservation.mutate({ id: editReservation.id, startDate: editForm.startDate, endDate: editForm.endDate, notes: editForm.notes || undefined })} disabled={updateReservation.isPending}>
              {updateReservation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirm */}
      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إلغاء الحجز</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من إلغاء هذا الحجز؟ سيتم تحرير السيارة وإتاحتها للحجز مرة أخرى.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => cancelId && deleteReservation.mutate({ id: cancelId })}>
              {deleteReservation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الإلغاء"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
