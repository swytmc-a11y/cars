import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InspectionFieldsRenderer, type InspectionAnswers, type InspectionField } from "@/components/InspectionFields";

export default function ReturnForm() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const contractId = Number(params.id);

  const [form, setForm] = useState({
    mileage: 0, fuelLevel: "full", fuelCost: "", fuelLiters: "", damageNotes: "",
    damageAmount: "0", lateFees: "0", additionalKmFees: "0",
  });

  const { data: templates } = trpc.inspections.templates.useQuery({ context: "return" });
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<InspectionAnswers>({});
  const selectedTemplate = templates?.find(t => t.id === templateId);

  useEffect(() => {
    if (templates?.length && templateId === null) setTemplateId(templates[0].id);
  }, [templates, templateId]);

  const utils = trpc.useUtils();
  const createMutation = trpc.returns.create.useMutation();
  const inspectionMutation = trpc.inspections.submit.useMutation();
  const isPending = createMutation.isPending || inspectionMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedTemplate) {
        const fields = (selectedTemplate.fields as InspectionField[]) ?? [];
        const missing = fields.filter(f => f.required && (answers[f.key] === undefined || answers[f.key] === null || answers[f.key] === "")).map(f => f.label);
        if (missing.length > 0) {
          toast.error(`حقول الفحص التالية مطلوبة: ${missing.join("، ")}`);
          return;
        }
      }
      await createMutation.mutateAsync({ contractId, ...form });
      if (selectedTemplate) {
        await inspectionMutation.mutateAsync({ templateId: selectedTemplate.id, contractId, context: "return", answers });
      }
      toast.success("تم استلام السيارة بنجاح");
      utils.contracts.getById.invalidate({ id: contractId });
      setLocation(`/contracts/${contractId}`);
    } catch (err: any) {
      toast.error(err?.message ?? "حدث خطأ أثناء الحفظ");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/contracts/${contractId}`)}><ArrowRight className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">استلام السيارة</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>بيانات الاستلام - عقد #{contractId}</CardTitle></CardHeader>
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
              <div className="space-y-2"><Label>تكلفة تعبئة الوقود (ر.س)</Label><Input type="number" min="0" step="0.01" value={form.fuelCost} onChange={e => setForm(f => ({ ...f, fuelCost: e.target.value }))} placeholder="اختياري" /></div>
              <div className="space-y-2"><Label>كمية الوقود (لتر)</Label><Input type="number" min="0" step="0.1" value={form.fuelLiters} onChange={e => setForm(f => ({ ...f, fuelLiters: e.target.value }))} placeholder="اختياري" /></div>
              <div className="space-y-2"><Label>رسوم الأضرار (ر.س)</Label><Input value={form.damageAmount} onChange={e => setForm(f => ({ ...f, damageAmount: e.target.value }))} /></div>
              <div className="space-y-2"><Label>رسوم التأخير (ر.س)</Label><Input value={form.lateFees} onChange={e => setForm(f => ({ ...f, lateFees: e.target.value }))} /></div>
              <div className="space-y-2"><Label>رسوم الكيلومترات الإضافية (ر.س)</Label><Input value={form.additionalKmFees} onChange={e => setForm(f => ({ ...f, additionalKmFees: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>ملاحظات الأضرار</Label><Textarea value={form.damageNotes} onChange={e => setForm(f => ({ ...f, damageNotes: e.target.value }))} placeholder="وصف الأضرار إن وجدت..." /></div>

            {templates && templates.length > 0 && (
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" /> نموذج الفحص
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {templates.length > 1 && (
                    <Select value={templateId ? String(templateId) : ""} onValueChange={v => { setTemplateId(Number(v)); setAnswers({}); }}>
                      <SelectTrigger><SelectValue placeholder="اختر نموذج الفحص" /></SelectTrigger>
                      <SelectContent>
                        {templates.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedTemplate && (
                    <InspectionFieldsRenderer
                      fields={(selectedTemplate.fields as InspectionField[]) ?? []}
                      answers={answers}
                      onChange={setAnswers}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isPending}>{isPending ? "جاري الحفظ..." : "تأكيد الاستلام"}</Button>
              <Button type="button" variant="outline" onClick={() => setLocation(`/contracts/${contractId}`)}>إلغاء</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
