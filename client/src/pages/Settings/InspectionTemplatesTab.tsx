import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, ClipboardCheck, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { FIELD_TYPE_LABELS, type InspectionField } from "@/components/InspectionFields";

const CONTEXT_LABELS: Record<string, string> = { handover: "التسليم", return: "الاستلام", both: "التسليم والاستلام" };

function emptyField(): InspectionField {
  return { key: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, type: "pass_fail", label: "", required: false };
}

export default function InspectionTemplatesTab() {
  const utils = trpc.useUtils();
  const { data: templates } = trpc.inspections.templates.useQuery({});

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [context, setContext] = useState<"handover" | "return" | "both">("both");
  const [fields, setFields] = useState<InspectionField[]>([emptyField()]);

  const createMutation = trpc.inspections.createTemplate.useMutation({
    onSuccess: () => { toast.success("تم إنشاء نموذج الفحص"); utils.inspections.templates.invalidate(); setOpen(false); },
    onError: e => toast.error(e.message),
  });
  const updateMutation = trpc.inspections.updateTemplate.useMutation({
    onSuccess: () => { toast.success("تم تحديث نموذج الفحص"); utils.inspections.templates.invalidate(); setOpen(false); },
    onError: e => toast.error(e.message),
  });

  function openCreate() {
    setEditingId(null);
    setName("");
    setContext("both");
    setFields([emptyField()]);
    setOpen(true);
  }

  function openEdit(template: any) {
    setEditingId(template.id);
    setName(template.name);
    setContext(template.context);
    setFields(Array.isArray(template.fields) ? template.fields : [emptyField()]);
    setOpen(true);
  }

  function updateField(index: number, patch: Partial<InspectionField>) {
    setFields(prev => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function handleSave() {
    if (!name.trim()) { toast.error("اسم النموذج مطلوب"); return; }
    const cleaned = fields.filter(f => f.label.trim());
    if (cleaned.length === 0) { toast.error("أضف حقلاً واحداً على الأقل بعنوان واضح"); return; }
    for (const f of cleaned) {
      if (f.type === "dropdown" && (!f.options || f.options.length === 0)) {
        toast.error(`حقل "${f.label}" من نوع قائمة يحتاج خيارات`);
        return;
      }
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, name: name.trim(), context, fields: cleaned });
    } else {
      createMutation.mutate({ name: name.trim(), context, fields: cleaned });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">نماذج الفحص الرقمية</h2>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 ml-2" />نموذج جديد</Button>
      </div>
      <p className="text-sm text-muted-foreground">
        صمّم نماذج فحص خاصة بمكتبك تُعرض تلقائياً في شاشتي تسليم واستلام السيارة (صور، عدادات، فحص سليم/غير سليم، توقيع العميل...).
      </p>

      <div className="space-y-3">
        {templates?.map(template => (
          <Card key={template.id}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-muted-foreground">
                  {(template.fields as any[])?.length ?? 0} حقول | يُستخدم في: {CONTEXT_LABELS[template.context]}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => openEdit(template)} title="تعديل">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" title="حذف"
                onClick={() => {
                  if (confirm(`هل تريد حذف نموذج "${template.name}"؟`)) {
                    updateMutation.mutate({ id: template.id, isActive: false });
                  }
                }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {templates?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">لا توجد نماذج فحص بعد — أنشئ أول نموذج لمكتبك.</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل نموذج الفحص" : "نموذج فحص جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم النموذج *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: فحص التسليم القياسي" />
              </div>
              <div className="space-y-2">
                <Label>يُستخدم في</Label>
                <Select value={context} onValueChange={v => setContext(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">التسليم والاستلام</SelectItem>
                    <SelectItem value="handover">التسليم فقط</SelectItem>
                    <SelectItem value="return">الاستلام فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>حقول النموذج</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setFields(prev => [...prev, emptyField()])}>
                  <Plus className="h-3.5 w-3.5 ml-1" /> إضافة حقل
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.key} className="border rounded-lg p-3 space-y-3 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input className="flex-1" placeholder="عنوان الحقل (مثال: حالة الإطارات)" value={field.label}
                      onChange={e => updateField(index, { label: e.target.value })} />
                    <Select value={field.type} onValueChange={v => updateField(index, { type: v as InspectionField["type"] })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => setFields(prev => prev.filter((_, i) => i !== index))} disabled={fields.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 pr-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={field.required ?? false} onCheckedChange={v => updateField(index, { required: v })} />
                      <span className="text-xs text-muted-foreground">إلزامي</span>
                    </div>
                    {field.type === "dropdown" && (
                      <Input className="flex-1" placeholder="الخيارات مفصولة بفاصلة: ممتاز، جيد، ضعيف"
                        value={(field.options ?? []).join("، ")}
                        onChange={e => updateField(index, { options: e.target.value.split(/[،,]/).map(s => s.trim()).filter(Boolean) })} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button className="w-full" onClick={handleSave} disabled={isPending}>
              {isPending ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إنشاء النموذج"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
