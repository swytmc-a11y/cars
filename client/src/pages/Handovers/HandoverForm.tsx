import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function HandoverForm() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const contractId = Number(params.id);

  const [form, setForm] = useState({ mileage: 0, fuelLevel: "full", notes: "" });

  const utils = trpc.useUtils();
  const createMutation = trpc.handovers.create.useMutation({
    onSuccess: () => { toast.success("تم تسليم السيارة بنجاح"); utils.contracts.getById.invalidate({ id: contractId }); setLocation(`/contracts/${contractId}`); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ contractId, ...form });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/contracts/${contractId}`)}><ArrowRight className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">تسليم السيارة</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>بيانات التسليم - عقد #{contractId}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>قراءة العداد (كم) *</Label><Input type="number" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: Number(e.target.value) }))} required /></div>
              <div className="space-y-2">
                <Label>مستوى الوقود</Label>
                <Select value={form.fuelLevel} onValueChange={v => setForm(f => ({ ...f, fuelLevel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">ممتلئ</SelectItem>
                    <SelectItem value="three_quarter">3/4</SelectItem>
                    <SelectItem value="half">نصف</SelectItem>
                    <SelectItem value="quarter">1/4</SelectItem>
                    <SelectItem value="empty">فارغ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>ملاحظات</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات حول حالة السيارة عند التسليم..." /></div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "جاري الحفظ..." : "تأكيد التسليم"}</Button>
              <Button type="button" variant="outline" onClick={() => setLocation(`/contracts/${contractId}`)}>إلغاء</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
