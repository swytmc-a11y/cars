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

export default function MaintenanceForm() {
  const [, setLocation] = useLocation();
  const { data: vehicles } = trpc.vehicles.list.useQuery({});

  const [form, setForm] = useState({
    vehicleId: 0, type: "scheduled" as "scheduled" | "unscheduled" | "preventive",
    reason: "", cost: "", odometerAtService: 0, startDate: "", notes: "",
  });

  const utils = trpc.useUtils();
  const createMutation = trpc.maintenance.create.useMutation({
    onSuccess: () => { toast.success("تم جدولة الصيانة"); utils.maintenance.list.invalidate(); setLocation("/maintenance"); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId || !form.reason || !form.startDate) { toast.error("يرجى ملء الحقول المطلوبة"); return; }
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/maintenance")}><ArrowRight className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">جدولة صيانة</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>بيانات الصيانة</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>السيارة *</Label>
                <Select value={String(form.vehicleId)} onValueChange={v => setForm(f => ({ ...f, vehicleId: Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="اختر السيارة" /></SelectTrigger>
                  <SelectContent>{vehicles?.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.brand} {v.model} - {v.plateNumber}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نوع الصيانة</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">دورية</SelectItem>
                    <SelectItem value="unscheduled">طارئة</SelectItem>
                    <SelectItem value="preventive">وقائية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>تاريخ البداية *</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>التكلفة المتوقعة (ر.س)</Label><Input value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} /></div>
              <div className="space-y-2"><Label>قراءة العداد</Label><Input type="number" value={form.odometerAtService} onChange={e => setForm(f => ({ ...f, odometerAtService: Number(e.target.value) }))} /></div>
            </div>
            <div className="space-y-2"><Label>سبب الصيانة *</Label><Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>ملاحظات</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "جاري الحفظ..." : "جدولة الصيانة"}</Button>
              <Button type="button" variant="outline" onClick={() => setLocation("/maintenance")}>إلغاء</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
