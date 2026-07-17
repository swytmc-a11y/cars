import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function VehicleForm() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const isEdit = !!params.id;

  const { data: branches } = trpc.branches.list.useQuery();
  const { data: vehicleData } = trpc.vehicles.getById.useQuery({ id: Number(params.id) }, { enabled: isEdit });

  const [form, setForm] = useState({
    plateNumber: "", brand: "", model: "", year: new Date().getFullYear(),
    color: "", category: "economy" as string, currentMileage: 0,
    dailyRate: "", weeklyRate: "", monthlyRate: "", branchId: 0,
  });

  useEffect(() => {
    if (vehicleData?.vehicle) {
      const v = vehicleData.vehicle;
      setForm({
        plateNumber: v.plateNumber, brand: v.brand, model: v.model, year: v.year,
        color: v.color || "", category: v.category, currentMileage: v.currentMileage,
        dailyRate: String(v.dailyRate), weeklyRate: v.weeklyRate ? String(v.weeklyRate) : "",
        monthlyRate: v.monthlyRate ? String(v.monthlyRate) : "", branchId: v.branchId,
      });
    }
  }, [vehicleData]);

  useEffect(() => {
    if (branches?.length && !form.branchId) setForm(f => ({ ...f, branchId: branches[0].id }));
  }, [branches]);

  const utils = trpc.useUtils();
  const createMutation = trpc.vehicles.create.useMutation({
    onSuccess: () => { toast.success("تم إضافة السيارة بنجاح"); utils.vehicles.list.invalidate(); setLocation("/vehicles"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.vehicles.update.useMutation({
    onSuccess: () => { toast.success("تم تحديث السيارة بنجاح"); utils.vehicles.list.invalidate(); setLocation("/vehicles"); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      updateMutation.mutate({ id: Number(params.id), ...form, category: form.category as 'economy' | 'family' | 'luxury' });
    } else {
      createMutation.mutate({ ...form, category: form.category as 'economy' | 'family' | 'luxury' });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/vehicles")}><ArrowRight className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">{isEdit ? "تعديل السيارة" : "إضافة سيارة جديدة"}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>{isEdit ? "تعديل البيانات" : "بيانات السيارة"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>رقم اللوحة *</Label><Input value={form.plateNumber} onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>الماركة *</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>الموديل *</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>السنة *</Label><Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} required /></div>
              <div className="space-y-2"><Label>اللون</Label><Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">اقتصادية</SelectItem>
                    <SelectItem value="family">عائلية</SelectItem>
                    <SelectItem value="luxury">فاخرة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>العداد (كم)</Label><Input type="number" value={form.currentMileage} onChange={e => setForm(f => ({ ...f, currentMileage: Number(e.target.value) }))} /></div>
              <div className="space-y-2">
                <Label>الفرع *</Label>
                <Select value={String(form.branchId)} onValueChange={v => setForm(f => ({ ...f, branchId: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {branches?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>السعر اليومي (ر.س) *</Label><Input value={form.dailyRate} onChange={e => setForm(f => ({ ...f, dailyRate: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>السعر الأسبوعي (ر.س)</Label><Input value={form.weeklyRate} onChange={e => setForm(f => ({ ...f, weeklyRate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>السعر الشهري (ر.س)</Label><Input value={form.monthlyRate} onChange={e => setForm(f => ({ ...f, monthlyRate: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إضافة السيارة"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setLocation("/vehicles")}>إلغاء</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
