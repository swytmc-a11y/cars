import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, CheckCircle2, XCircle, Eraser, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface InspectionField {
  key: string;
  type: "photo" | "number" | "text" | "pass_fail" | "dropdown" | "date" | "signature";
  label: string;
  required?: boolean;
  options?: string[];
}

export type InspectionAnswers = Record<string, string | number | boolean | null>;

export const FIELD_TYPE_LABELS: Record<InspectionField["type"], string> = {
  photo: "صورة",
  number: "رقم / عداد",
  text: "نص",
  pass_fail: "سليم / غير سليم",
  dropdown: "قائمة اختيار",
  date: "تاريخ",
  signature: "توقيع",
};

function PhotoField({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const uploadMutation = trpc.inspections.uploadPhoto.useMutation({
    onSuccess: ({ url }) => onChange(url),
    onError: e => toast.error(e.message),
  });

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => uploadMutation.mutate({ base64: String(reader.result), mimeType: file.type });
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="" className="h-20 w-20 object-cover rounded-lg border" />
          <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>إزالة</Button>
        </div>
      ) : (
        <label className="flex items-center gap-2 border border-dashed rounded-lg p-3 cursor-pointer hover:bg-accent/50 text-sm text-muted-foreground">
          {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {uploadMutation.isPending ? "جاري الرفع..." : "التقاط / اختيار صورة"}
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => handleFile(e.target.files?.[0])} disabled={uploadMutation.isPending} />
        </label>
      )}
    </div>
  );
}

function SignatureField({ value, onChange }: { value: string | null; onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  if (value) {
    return (
      <div className="flex items-center gap-3">
        <img src={value} alt="التوقيع" className="h-16 bg-white rounded-lg border" />
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>إعادة التوقيع</Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        className="border rounded-lg bg-white w-full max-w-md touch-none cursor-crosshair"
        onPointerDown={e => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = e.currentTarget.getContext("2d")!;
          const p = pos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={e => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d")!;
          const p = pos(e);
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.strokeStyle = "#1a1a1a";
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          setDirty(true);
        }}
        onPointerUp={() => { drawing.current = false; }}
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={!dirty}
          onClick={() => onChange(canvasRef.current!.toDataURL("image/png"))}>
          اعتماد التوقيع
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => {
          const canvas = canvasRef.current!;
          canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
          setDirty(false);
        }}>
          <Eraser className="h-3.5 w-3.5 ml-1" /> مسح
        </Button>
      </div>
    </div>
  );
}

export function InspectionFieldsRenderer({ fields, answers, onChange }: {
  fields: InspectionField[];
  answers: InspectionAnswers;
  onChange: (answers: InspectionAnswers) => void;
}) {
  const set = (key: string, value: InspectionAnswers[string]) => onChange({ ...answers, [key]: value });

  return (
    <div className="space-y-4">
      {fields.map(field => (
        <div key={field.key} className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          {field.type === "text" && (
            <Textarea value={(answers[field.key] as string) ?? ""} onChange={e => set(field.key, e.target.value)} rows={2} />
          )}
          {field.type === "number" && (
            <Input type="number" value={(answers[field.key] as number | string) ?? ""}
              onChange={e => set(field.key, e.target.value === "" ? null : Number(e.target.value))} />
          )}
          {field.type === "date" && (
            <Input type="date" value={(answers[field.key] as string) ?? ""} onChange={e => set(field.key, e.target.value)} />
          )}
          {field.type === "dropdown" && (
            <Select value={(answers[field.key] as string) ?? ""} onValueChange={v => set(field.key, v)}>
              <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
              <SelectContent>
                {(field.options ?? []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {field.type === "pass_fail" && (
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={answers[field.key] === "pass" ? "default" : "outline"}
                className={answers[field.key] === "pass" ? "bg-green-600 hover:bg-green-500" : ""}
                onClick={() => set(field.key, "pass")}>
                <CheckCircle2 className="h-4 w-4 ml-1" /> سليم
              </Button>
              <Button type="button" size="sm" variant={answers[field.key] === "fail" ? "destructive" : "outline"}
                onClick={() => set(field.key, "fail")}>
                <XCircle className="h-4 w-4 ml-1" /> غير سليم
              </Button>
            </div>
          )}
          {field.type === "photo" && (
            <PhotoField value={(answers[field.key] as string) ?? null} onChange={url => set(field.key, url)} />
          )}
          {field.type === "signature" && (
            <SignatureField value={(answers[field.key] as string) ?? null} onChange={url => set(field.key, url)} />
          )}
        </div>
      ))}
    </div>
  );
}
