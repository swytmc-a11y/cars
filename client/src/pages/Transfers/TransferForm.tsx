import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function TransferForm() {
  const [, setLocation] = useLocation();
  const { data: vehicles } = trpc.vehicles.list.useQuery({ status: "available" });
  const { data: branches } = trpc.branches.list.useQuery();

  const [form, setForm] = useState({ vehicleId: 0, fromBranchId: 0, toBranchId: 0, notes: "" });

  const utils = trpc.useUtils();
  const createMutation = trpc.transfers.create.useMutation({
    onSuccess: () => { toast.success("تم إنشاء طلب النقل"); utils.transfers.list.invalidate(); setLocation("/transfers"); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId || !form.fromBranchId || !form.toBranchId) { toast.error("يرجى ملء جميع الحقول"); return; }
    if (form.fromBranchId === form.toBranchId) { toast.error("يجب اختيار فرعين مختلفين"); return; }
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/transfers")}><ArrowRight className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">طلب نقل سيارة</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>بيانات النقل</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>السيارة *</Label>
                <Select value={String(form.vehicleId)} onValueChange={v => setForm(f => ({ ...f, vehicleId: Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="اختر السيارة" /></SelectTrigger>
                  <SelectContent>{vehicles?.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.brand} {v.model} - {v.plateNumber}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>من فرع *</Label>
                <Select value={String(form.fromBranchId)} onValueChange={v => setForm(f => ({ ...f, fromBranchId: Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="الفرع المرسل" /></SelectTrigger>
                  <SelectContent>{branches?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>إلى فرع *</Label>
                <Select value={String(form.toBranchId)} onValueChange={v => setForm(f => ({ ...f, toBranchId: Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="الفرع المستلم" /></SelectTrigger>
                  <SelectContent>{branches?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>ملاحظات</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "جاري الإنشاء..." : "إنشاء طلب النقل"}</Button>
              <Button type="button" variant="outline" onClick={() => setLocation("/transfers")}>إلغاء</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
