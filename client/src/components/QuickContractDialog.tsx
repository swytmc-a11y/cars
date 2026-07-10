import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Search, CheckCircle, Car, CalendarDays, User, ImageIcon } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

type Props = { open: boolean; onClose: () => void };

const categoryLabels: Record<string, string> = { economy: "اقتصادية", family: "عائلية", luxury: "فاخرة" };

export default function QuickContractDialog({ open, onClose }: Props) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"customer" | "vehicle" | "dates" | "confirm">("customer");
  const [customerTab, setCustomerTab] = useState<"existing" | "new">("existing");

  // Customer state
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", idNumber: "", licenseNumber: "", email: "" });

  // Document images for new customer
  const [idImageBase64, setIdImageBase64] = useState<{ base64: string; mimeType: string } | null>(null);
  const [licenseImageBase64, setLicenseImageBase64] = useState<{ base64: string; mimeType: string } | null>(null);

  // Vehicle state
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  // Dates state
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");

  // Data
  const { data: customers } = trpc.customers.list.useQuery({ search: customerSearch }, { enabled: customerTab === "existing" });
  const { data: vehicles } = trpc.vehicles.list.useQuery({ status: "available" });
  const { data: branches } = trpc.branches.list.useQuery();

  const selectedVehicle = useMemo(() => vehicles?.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);
  const selectedCustomer = useMemo(() => customers?.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);

  const totalDays = useMemo(() => {
    const s = new Date(startDate), e = new Date(endDate);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [startDate, endDate]);

  const dailyRate = selectedVehicle?.dailyRate ? Number(selectedVehicle.dailyRate) : 0;
  const basePrice = dailyRate * totalDays;
  const finalPrice = basePrice - Number(discount || 0);

  const createMutation = trpc.quickContract.create.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إنشاء العقد ${data.contractNumber} بنجاح!`);
      onClose();
      resetForm();
      setLocation(`/contracts/${data.contractId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setStep("customer");
    setCustomerTab("existing");
    setCustomerSearch("");
    setSelectedCustomerId(null);
    setNewCustomer({ name: "", phone: "", idNumber: "", licenseNumber: "", email: "" });
    setIdImageBase64(null);
    setLicenseImageBase64(null);
    setSelectedVehicleId(null);
    setStartDate(new Date().toISOString().split("T")[0]);
    const d = new Date(); d.setDate(d.getDate() + 1);
    setEndDate(d.toISOString().split("T")[0]);
    setDiscount("0");
    setNotes("");
  }

  function handleClose() {
    onClose();
    resetForm();
  }

  function handleSubmit() {
    // Use the selected vehicle's branchId, fallback to first branch
    const branchId = selectedVehicle?.branchId ?? branches?.[0]?.id ?? 1;
    const payload: any = {
      vehicleId: selectedVehicleId!,
      branchId,
      startDate,
      endDate,
      dailyRate: String(dailyRate),
      totalDays,
      basePrice: String(basePrice),
      discount: String(discount || 0),
      notes: notes || undefined,
    };
    if (customerTab === "existing" && selectedCustomerId) {
      payload.customerId = selectedCustomerId;
    } else {
      payload.newCustomer = {
        ...newCustomer,
        idImageBase64: idImageBase64?.base64,
        idImageMimeType: idImageBase64?.mimeType,
        licenseImageBase64: licenseImageBase64?.base64,
        licenseImageMimeType: licenseImageBase64?.mimeType,
      };
    }
    createMutation.mutate(payload);
  }

  const canProceedCustomer = customerTab === "existing"
    ? !!selectedCustomerId
    : newCustomer.name.trim().length > 0 && newCustomer.phone.trim().length > 0;

  const canProceedVehicle = !!selectedVehicleId;
  const canProceedDates = totalDays > 0 && finalPrice > 0;

  const steps = [
    { id: "customer", label: "العميل", icon: User },
    { id: "vehicle", label: "السيارة", icon: Car },
    { id: "dates", label: "التواريخ", icon: CalendarDays },
    { id: "confirm", label: "تأكيد", icon: CheckCircle },
  ];
  const stepIndex = steps.findIndex(s => s.id === step);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Car className="h-5 w-5 text-primary" />
            إنشاء عقد سريع
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-4">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                i === stepIndex ? 'bg-primary text-primary-foreground' :
                i < stepIndex ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
              }`}>
                <s.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${i < stepIndex ? 'bg-green-400' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Customer */}
        {step === "customer" && (
          <div className="space-y-4">
            <Tabs value={customerTab} onValueChange={v => setCustomerTab(v as any)}>
              <TabsList className="w-full">
                <TabsTrigger value="existing" className="flex-1">عميل موجود</TabsTrigger>
                <TabsTrigger value="new" className="flex-1">
                  <UserPlus className="h-3.5 w-3.5 ml-1" />عميل جديد
                </TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-3 mt-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث بالاسم أو الهاتف أو رقم الهوية..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="pr-9"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-1">
                  {customers?.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">لا يوجد عملاء</p>
                  )}
                  {customers?.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`w-full text-right px-3 py-2 rounded-md transition-colors flex items-center justify-between ${
                        selectedCustomerId === c.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.phone}</div>
                      </div>
                      {c.isBlacklisted && <Badge variant="destructive" className="text-xs">محظور</Badge>}
                      {selectedCustomerId === c.id && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="new" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label>الاسم الكامل *</Label>
                    <Input value={newCustomer.name} onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))} placeholder="أحمد محمد" />
                  </div>
                  <div className="space-y-1">
                    <Label>رقم الهاتف *</Label>
                    <Input value={newCustomer.phone} onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))} placeholder="05xxxxxxxx" />
                  </div>
                  <div className="space-y-1">
                    <Label>رقم الهوية</Label>
                    <Input value={newCustomer.idNumber} onChange={e => setNewCustomer(p => ({ ...p, idNumber: e.target.value }))} placeholder="1xxxxxxxxx" />
                  </div>
                  <div className="space-y-1">
                    <Label>رقم الرخصة</Label>
                    <Input value={newCustomer.licenseNumber} onChange={e => setNewCustomer(p => ({ ...p, licenseNumber: e.target.value }))} placeholder="رقم رخصة القيادة" />
                  </div>
                  <div className="space-y-1">
                    <Label>البريد الإلكتروني</Label>
                    <Input value={newCustomer.email} onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))} placeholder="example@email.com" type="email" />
                  </div>
                </div>
                {/* Document Images */}
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5" />
                    صور الوثائق (اختياري)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <ImageUpload
                      label="صورة الهوية"
                      icon="id"
                      onFileSelect={(base64, mimeType) => setIdImageBase64({ base64, mimeType })}
                      onRemove={() => setIdImageBase64(null)}
                    />
                    <ImageUpload
                      label="صورة الرخصة"
                      icon="license"
                      onFileSelect={(base64, mimeType) => setLicenseImageBase64({ base64, mimeType })}
                      onRemove={() => setLicenseImageBase64(null)}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Button className="w-full" onClick={() => setStep("vehicle")} disabled={!canProceedCustomer}>
              التالي: اختر السيارة
            </Button>
          </div>
        )}

        {/* Step 2: Vehicle */}
        {step === "vehicle" && (
          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {vehicles?.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">لا توجد سيارات متاحة</p>
              )}
              {vehicles?.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`w-full text-right p-3 rounded-lg border transition-all ${
                    selectedVehicleId === v.id ? 'border-primary bg-primary/5' : 'hover:bg-muted border-transparent hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{v.brand} {v.model} {v.year}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {v.plateNumber} · {v.color} · {categoryLabels[v.category || ''] || v.category}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-primary">{Number(v.dailyRate).toLocaleString('ar-SA')} ر.س</div>
                      <div className="text-xs text-muted-foreground">يومياً</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("customer")}>رجوع</Button>
              <Button className="flex-1" onClick={() => setStep("dates")} disabled={!canProceedVehicle}>التالي: التواريخ</Button>
            </div>
          </div>
        )}

        {/* Step 3: Dates & Price */}
        {step === "dates" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>تاريخ البداية</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-1">
                <Label>تاريخ النهاية</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
              </div>
              <div className="space-y-1">
                <Label>الخصم (ر.س)</Label>
                <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} min="0" max={String(basePrice)} />
              </div>
              <div className="space-y-1">
                <Label>ملاحظات</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختياري" />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">عدد الأيام</span><span className="font-medium">{totalDays} يوم</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">السعر اليومي</span><span className="font-medium">{dailyRate.toLocaleString('ar-SA')} ر.س</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الإجمالي</span><span className="font-medium">{basePrice.toLocaleString('ar-SA')} ر.س</span></div>
              {Number(discount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">الخصم</span><span className="text-green-600">-{Number(discount).toLocaleString('ar-SA')} ر.س</span></div>}
              <Separator />
              <div className="flex justify-between font-bold text-base"><span>المبلغ النهائي</span><span className="text-primary">{finalPrice.toLocaleString('ar-SA')} ر.س</span></div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("vehicle")}>رجوع</Button>
              <Button className="flex-1" onClick={() => setStep("confirm")} disabled={!canProceedDates}>التالي: مراجعة</Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1 font-medium">العميل</div>
                {customerTab === "existing" && selectedCustomer ? (
                  <div>
                    <div className="font-medium">{selectedCustomer.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedCustomer.phone}</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">{newCustomer.name} <Badge variant="outline" className="text-xs mr-1">جديد</Badge></div>
                    <div className="text-sm text-muted-foreground">{newCustomer.phone}</div>
                  </div>
                )}
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1 font-medium">السيارة</div>
                <div className="font-medium">{selectedVehicle?.brand} {selectedVehicle?.model} {selectedVehicle?.year}</div>
                <div className="text-sm text-muted-foreground">{selectedVehicle?.plateNumber}</div>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1 font-medium">تفاصيل العقد</div>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <span className="text-muted-foreground">من:</span><span>{new Date(startDate).toLocaleDateString('ar-SA')}</span>
                  <span className="text-muted-foreground">إلى:</span><span>{new Date(endDate).toLocaleDateString('ar-SA')}</span>
                  <span className="text-muted-foreground">المدة:</span><span>{totalDays} يوم</span>
                  <span className="text-muted-foreground">المبلغ:</span><span className="font-bold text-primary">{finalPrice.toLocaleString('ar-SA')} ر.س</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("dates")}>رجوع</Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء العقد"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
