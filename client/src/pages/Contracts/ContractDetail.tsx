import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, HandMetal, RotateCcw, CreditCard, FileDown, Receipt, Loader2 } from "lucide-react";
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

  const contractPdfMutation = trpc.contracts.generatePdf.useMutation({
    onSuccess: ({ url }) => window.open(url, "_blank"),
    onError: (e) => toast.error(e.message),
  });

  const [receiptPdfPaymentId, setReceiptPdfPaymentId] = useState<number | null>(null);
  const receiptPdfMutation = trpc.payments.generatePdf.useMutation({
    onSuccess: ({ url }) => window.open(url, "_blank"),
    onError: (e) => toast.error(e.message),
    onSettled: () => setReceiptPdfPaymentId(null),
  });

  const handlePrintContract = useCallback(() => {
    if (!data) return;
    contractPdfMutation.mutate({ id: data.contract.id });
  }, [data, contractPdfMutation]);

  const handlePrintReceipt = useCallback((payment: { id: number }) => {
    setReceiptPdfPaymentId(payment.id);
    receiptPdfMutation.mutate({ id: payment.id });
  }, [receiptPdfMutation]);

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
        <Button variant="outline" size="sm" onClick={handlePrintContract} disabled={contractPdfMutation.isPending}>
          {contractPdfMutation.isPending ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <FileDown className="h-4 w-4 ml-2" />}
          تنزيل PDF
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
                      <Button variant="ghost" size="icon" onClick={() => handlePrintReceipt(p)} disabled={receiptPdfPaymentId === p.id} title="تنزيل إيصال PDF">
                        {receiptPdfPaymentId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
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
