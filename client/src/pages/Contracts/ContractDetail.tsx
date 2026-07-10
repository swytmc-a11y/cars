import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, HandMetal, RotateCcw, CreditCard, Printer, FileDown, Receipt } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusLabels: Record<string, string> = { draft: "مسودة", active: "نشط", completed: "مكتمل", cancelled: "ملغي" };
const methodLabels: Record<string, string> = { cash: "نقدي", card: "بطاقة", bank_transfer: "تحويل بنكي", stc_pay: "STC Pay" };

function generateContractPDF(contract: any, customer: any, vehicle: any) {
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>عقد تأجير - ${contract.contractNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'IBM Plex Sans Arabic', sans-serif; direction: rtl; padding: 40px; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
    .header h1 { font-size: 24px; color: #2563eb; margin-bottom: 5px; }
    .header p { color: #666; font-size: 14px; }
    .contract-number { background: #f0f4ff; padding: 10px 20px; border-radius: 8px; display: inline-block; margin: 10px 0; font-weight: 700; font-size: 18px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: 700; color: #2563eb; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { padding: 8px 12px; background: #f9fafb; border-radius: 6px; }
    .field-label { font-size: 12px; color: #6b7280; margin-bottom: 2px; }
    .field-value { font-size: 14px; font-weight: 600; }
    .total-section { background: #f0f4ff; padding: 20px; border-radius: 12px; margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .total-row.final { font-size: 18px; font-weight: 700; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 12px; margin-top: 8px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
    .signature-box { text-align: center; padding-top: 40px; border-top: 1px solid #333; }
    .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>عقد تأجير سيارة</h1>
    <p>نظام إدارة التأجير</p>
    <div class="contract-number">${contract.contractNumber}</div>
  </div>

  <div class="section">
    <div class="section-title">بيانات العميل</div>
    <div class="grid">
      <div class="field"><div class="field-label">الاسم</div><div class="field-value">${customer?.name || '-'}</div></div>
      <div class="field"><div class="field-label">رقم الهوية</div><div class="field-value">${customer?.idNumber || '-'}</div></div>
      <div class="field"><div class="field-label">الهاتف</div><div class="field-value">${customer?.phone || '-'}</div></div>
      <div class="field"><div class="field-label">رقم الرخصة</div><div class="field-value">${customer?.licenseNumber || '-'}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">بيانات السيارة</div>
    <div class="grid">
      <div class="field"><div class="field-label">السيارة</div><div class="field-value">${vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : '-'}</div></div>
      <div class="field"><div class="field-label">رقم اللوحة</div><div class="field-value">${vehicle?.plateNumber || '-'}</div></div>
      <div class="field"><div class="field-label">اللون</div><div class="field-value">${vehicle?.color || '-'}</div></div>
      <div class="field"><div class="field-label">العداد</div><div class="field-value">${contract.startMileage?.toLocaleString('ar-SA') || '-'} كم</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">تفاصيل العقد</div>
    <div class="grid">
      <div class="field"><div class="field-label">تاريخ البداية</div><div class="field-value">${new Date(contract.startDate).toLocaleDateString('ar-SA')}</div></div>
      <div class="field"><div class="field-label">تاريخ النهاية</div><div class="field-value">${new Date(contract.endDate).toLocaleDateString('ar-SA')}</div></div>
      <div class="field"><div class="field-label">عدد الأيام</div><div class="field-value">${contract.totalDays} يوم</div></div>
      <div class="field"><div class="field-label">السعر اليومي</div><div class="field-value">${Number(contract.dailyRate).toLocaleString('ar-SA')} ر.س</div></div>
    </div>
  </div>

  <div class="total-section">
    <div class="total-row"><span>السعر الأساسي</span><span>${Number(contract.basePrice).toLocaleString('ar-SA')} ر.س</span></div>
    ${Number(contract.discount) > 0 ? `<div class="total-row"><span>الخصم</span><span style="color:green">-${Number(contract.discount).toLocaleString('ar-SA')} ر.س</span></div>` : ''}
    ${Number(contract.additionalCharges) > 0 ? `<div class="total-row"><span>رسوم إضافية</span><span style="color:red">+${Number(contract.additionalCharges).toLocaleString('ar-SA')} ر.س</span></div>` : ''}
    <div class="total-row final"><span>الإجمالي المستحق</span><span>${Number(contract.finalPrice || contract.basePrice).toLocaleString('ar-SA')} ر.س</span></div>
  </div>

  <div class="signatures">
    <div class="signature-box">توقيع المؤجر</div>
    <div class="signature-box">توقيع المستأجر</div>
  </div>

  <div class="footer">
    <p>تم إنشاء هذا العقد بتاريخ ${new Date(contract.createdAt).toLocaleDateString('ar-SA')}</p>
  </div>
</body>
</html>`;
  return html;
}

function generateReceiptHTML(payment: any, contract: any, customer: any) {
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>إيصال دفع</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'IBM Plex Sans Arabic', sans-serif; direction: rtl; padding: 40px; max-width: 400px; margin: 0 auto; }
    .receipt { border: 2px solid #e5e7eb; border-radius: 12px; padding: 30px; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h2 { color: #2563eb; font-size: 20px; }
    .header p { color: #666; font-size: 12px; margin-top: 4px; }
    .divider { border-top: 1px dashed #ccc; margin: 15px 0; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .row.total { font-weight: 700; font-size: 18px; color: #2563eb; margin-top: 10px; }
    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 11px; }
    @media print { body { padding: 10px; } .receipt { border: none; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h2>إيصال دفع</h2>
      <p>نظام إدارة التأجير</p>
    </div>
    <div class="divider"></div>
    <div class="row"><span>رقم العقد</span><span>${contract?.contractNumber || '-'}</span></div>
    <div class="row"><span>العميل</span><span>${customer?.name || '-'}</span></div>
    <div class="row"><span>التاريخ</span><span>${new Date(payment.paidAt).toLocaleDateString('ar-SA')}</span></div>
    <div class="row"><span>طريقة الدفع</span><span>${methodLabels[payment.method] || payment.method}</span></div>
    <div class="divider"></div>
    <div class="row total"><span>المبلغ المدفوع</span><span>${Number(payment.amount).toLocaleString('ar-SA')} ر.س</span></div>
    <div class="divider"></div>
    <div class="footer">
      <p>شكراً لتعاملكم معنا</p>
      <p>رقم الإيصال: PAY-${payment.id}</p>
    </div>
  </div>
</body>
</html>`;
  return html;
}

function openPrintWindow(html: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}

export default function ContractDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.contracts.getById.useQuery({ id: Number(params.id) });
  const { data: vehicles } = trpc.vehicles.list.useQuery({});
  const { data: customers } = trpc.customers.list.useQuery({});
  const utils = trpc.useUtils();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "cash" as "cash" | "card" | "bank_transfer" | "stc_pay", notes: "" });

  const paymentMutation = trpc.payments.create.useMutation({
    onSuccess: () => { toast.success("تم تسجيل الدفعة"); setPaymentOpen(false); utils.contracts.getById.invalidate({ id: Number(params.id) }); setPaymentForm({ amount: "", method: "cash", notes: "" }); },
    onError: (e) => toast.error(e.message),
  });

  const handlePrintContract = useCallback(() => {
    if (!data) return;
    const { contract } = data;
    const vehicle = vehicles?.find(v => v.id === contract.vehicleId);
    const customer = customers?.find(c => c.id === contract.customerId);
    const html = generateContractPDF(contract, customer, vehicle);
    openPrintWindow(html);
  }, [data, vehicles, customers]);

  const handlePrintReceipt = useCallback((payment: any) => {
    if (!data) return;
    const { contract } = data;
    const customer = customers?.find(c => c.id === contract.customerId);
    const html = generateReceiptHTML(payment, contract, customer);
    openPrintWindow(html);
  }, [data, customers]);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
  if (!data) return <div className="text-center py-12 text-muted-foreground">العقد غير موجود</div>;

  const { contract, payments, handover, return: returnRecord, totalPaid } = data;
  const vehicle = vehicles?.find(v => v.id === contract.vehicleId);
  const customer = customers?.find(c => c.id === contract.customerId);
  const remaining = Number(contract.finalPrice || contract.basePrice) - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/contracts")}><ArrowRight className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">{contract.contractNumber}</h1>
        <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>{statusLabels[contract.status]}</Badge>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handlePrintContract}>
          <Printer className="h-4 w-4 ml-2" />طباعة العقد
        </Button>
        {contract.status === 'active' && !handover && (
          <Button onClick={() => setLocation(`/contracts/${contract.id}/handover`)}><HandMetal className="h-4 w-4 ml-2" />تسليم السيارة</Button>
        )}
        {contract.status === 'active' && handover && !returnRecord && (
          <Button variant="outline" onClick={() => setLocation(`/contracts/${contract.id}/return`)}><RotateCcw className="h-4 w-4 ml-2" />استلام السيارة</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">العميل</div><div className="font-bold mt-1">{customer?.name || '-'}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">السيارة</div><div className="font-bold mt-1">{vehicle ? `${vehicle.brand} ${vehicle.model}` : '-'}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">المبلغ الإجمالي</div><div className="font-bold mt-1 text-primary">{Number(contract.finalPrice || contract.basePrice).toLocaleString('ar-SA')} ر.س</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">المتبقي</div><div className={`font-bold mt-1 ${remaining > 0 ? 'text-destructive' : 'text-green-600'}`}>{remaining.toLocaleString('ar-SA')} ر.س</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>تفاصيل العقد</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">تاريخ البداية</span><span>{new Date(contract.startDate).toLocaleDateString('ar-SA')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">تاريخ النهاية</span><span>{new Date(contract.endDate).toLocaleDateString('ar-SA')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">عدد الأيام</span><span>{contract.totalDays}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">السعر اليومي</span><span>{Number(contract.dailyRate).toLocaleString('ar-SA')} ر.س</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">السعر الأساسي</span><span>{Number(contract.basePrice).toLocaleString('ar-SA')} ر.س</span></div>
            {Number(contract.discount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">الخصم</span><span className="text-green-600">-{Number(contract.discount).toLocaleString('ar-SA')} ر.س</span></div>}
            {Number(contract.additionalCharges) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">رسوم إضافية</span><span className="text-destructive">+{Number(contract.additionalCharges).toLocaleString('ar-SA')} ر.س</span></div>}
            <Separator />
            <div className="flex justify-between font-bold"><span>الإجمالي</span><span>{Number(contract.finalPrice || contract.basePrice).toLocaleString('ar-SA')} ر.س</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>المدفوعات</CardTitle>
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><CreditCard className="h-4 w-4 ml-2" />تسجيل دفعة</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>تسجيل دفعة جديدة</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>المبلغ (ر.س)</Label><Input value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} /></div>
                  <div className="space-y-2">
                    <Label>طريقة الدفع</Label>
                    <Select value={paymentForm.method} onValueChange={v => setPaymentForm(f => ({ ...f, method: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">نقدي</SelectItem>
                        <SelectItem value="card">بطاقة</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="stc_pay">STC Pay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={() => paymentMutation.mutate({ contractId: contract.id, ...paymentForm })} disabled={paymentMutation.isPending}>
                    {paymentMutation.isPending ? "جاري الحفظ..." : "تسجيل الدفعة"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? <p className="text-muted-foreground text-center py-4">لا توجد مدفوعات</p> : (
              <div className="space-y-3">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                    <div>
                      <div className="text-sm font-medium">{Number(p.amount).toLocaleString('ar-SA')} ر.س</div>
                      <div className="text-xs text-muted-foreground">{new Date(p.paidAt).toLocaleDateString('ar-SA')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{methodLabels[p.method] || p.method}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => handlePrintReceipt(p)} title="طباعة إيصال">
                        <Receipt className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>إجمالي المدفوع</span>
                  <span className="text-primary">{totalPaid.toLocaleString('ar-SA')} ر.س</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
