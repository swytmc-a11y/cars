import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function ReservationForm() {
  const [, setLocation] = useLocation();
  const { data: vehicles } = trpc.vehicles.list.useQuery({ status: "available" });
  const { data: customers } = trpc.customers.list.useQuery({});

  const [form, setForm] = useState({ customerId: 0, vehicleId: 0, startDate: "", endDate: "", notes: "" });

  const utils = trpc.useUtils();
  const createMutation = trpc.reservations.create.useMutation({
    onSuccess: () => { toast.success("تم إنشاء الحجز بنجاح"); utils.reservations.list.invalidate(); setLocation("/reservations"); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.vehicleId) { toast.error("يرجى اختيار العميل والسيارة"); return; }
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/reservations")}><ArrowRight className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">حجز جديد</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>بيانات الحجز</CardTitle></CardHeader>
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
                  <SelectContent>{vehicles?.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.brand} {v.model} - {v.plateNumber}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>تاريخ البداية *</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>تاريخ النهاية *</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required /></div>
            </div>
            <div className="space-y-2"><Label>ملاحظات</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "جاري الحفظ..." : "إنشاء الحجز"}</Button>
              <Button type="button" variant="outline" onClick={() => setLocation("/reservations")}>إلغاء</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
