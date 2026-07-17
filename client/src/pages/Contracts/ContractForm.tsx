import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function ContractForm() {
  const [, setLocation] = useLocation();
  const { data: vehicles } = trpc.vehicles.list.useQuery({ status: "available" });
  const { data: customers } = trpc.customers.list.useQuery({});
  const { data: branches } = trpc.branches.list.useQuery();

  const [form, setForm] = useState({
    customerId: 0, vehicleId: 0, branchId: 0,
    startDate: "", endDate: "", discount: "0", notes: "",
  });

  const selectedVehicle = useMemo(() => vehicles?.find(v => v.id === form.vehicleId), [vehicles, form.vehicleId]);
  const totalDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    const diff = new Date(form.endDate).getTime() - new Date(form.startDate).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [form.startDate, form.endDate]);
  const dailyRate = selectedVehicle ? Number(selectedVehicle.dailyRate) : 0;
  const basePrice = dailyRate * totalDays;

  const utils = trpc.useUtils();
  const createMutation = trpc.contracts.create.useMutation({
    onSuccess: (data) => { toast.success(`تم إنشاء العقد ${data.contractNumber}`); utils.contracts.list.invalidate(); setLocation(`/contracts/${data.id}`); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.vehicleId || !form.branchId) { toast.error("يرجى ملء جميع الحقول المطلوبة"); return; }
    createMutation.mutate({
      ...form,
      dailyRate: String(dailyRate),
      totalDays,
      basePrice: String(basePrice),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/contracts")}><ArrowRight className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">عقد إيجار جديد</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>بيانات العقد</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>العميل *</Label>
                <Select value={String(form.customerId)} onValueChange={v => setForm(f => ({ ...f, customerId: Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                  <SelectContent>{customers?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name} - {c.phone}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>السيارة *</Label>
                <Select value={String(form.vehicleId)} onValueChange={v => setForm(f => ({ ...f, vehicleId: Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="اختر السيارة" /></SelectTrigger>
                  <SelectContent>{vehicles?.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.brand} {v.model} - {v.plateNumber} ({Number(v.dailyRate)} ر.س/يوم)</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الفرع *</Label>
                <Select value={String(form.branchId)} onValueChange={v => setForm(f => ({ ...f, branchId: Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                  <SelectContent>{branches?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>الخصم (ر.س)</Label><Input value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} /></div>
              <div className="space-y-2"><Label>تاريخ البداية *</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>تاريخ النهاية *</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required /></div>
            </div>
            <div className="space-y-2"><Label>ملاحظات</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>

            {totalDays > 0 && selectedVehicle && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between text-sm"><span>السعر اليومي</span><span>{dailyRate.toLocaleString('ar-SA')} ر.س</span></div>
                  <div className="flex justify-between text-sm"><span>عدد الأيام</span><span>{totalDays}</span></div>
                  <div className="flex justify-between text-sm"><span>السعر الأساسي</span><span>{basePrice.toLocaleString('ar-SA')} ر.س</span></div>
                  {Number(form.discount) > 0 && <div className="flex justify-between text-sm text-green-600"><span>الخصم</span><span>-{Number(form.discount).toLocaleString('ar-SA')} ر.س</span></div>}
                  <div className="flex justify-between font-bold border-t pt-2"><span>الإجمالي</span><span className="text-primary">{(basePrice - Number(form.discount || 0)).toLocaleString('ar-SA')} ر.س</span></div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "جاري الإنشاء..." : "إنشاء العقد"}</Button>
              <Button type="button" variant="outline" onClick={() => setLocation("/contracts")}>إلغاء</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
