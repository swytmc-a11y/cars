import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ExcelExport } from "@/components/ExcelExport";

const methodLabels: Record<string, string> = { cash: "نقدي", card: "بطاقة", bank_transfer: "تحويل بنكي", stc_pay: "STC Pay" };

export default function PaymentsList() {
  const [, setLocation] = useLocation();
  const { data: contracts, isLoading } = trpc.contracts.list.useQuery({});
  const { data: customers } = trpc.customers.list.useQuery({});
  const { data: allPayments, isLoading: paymentsLoading } = trpc.export.payments.useQuery({});

  const getCustomer = (id: number) => customers?.find(c => c.id === id);

  // Prepare export data
  const exportData = (allPayments ?? []).map(p => ({
    contractNumber: p.contractNumber ?? '-',
    customerName: p.customerName ?? '-',
    vehiclePlate: p.vehiclePlate ?? '-',
    amount: Number(p.amount ?? 0).toLocaleString('ar-SA'),
    method: methodLabels[p.method ?? ''] ?? p.method ?? '-',
    paidAt: p.paidAt ? new Date(p.paidAt).toLocaleDateString('ar-SA') : '-',
    notes: p.notes ?? '',
  }));

  const exportHeaders: { key: keyof typeof exportData[0]; label: string }[] = [
    { key: 'contractNumber', label: 'رقم العقد' },
    { key: 'customerName', label: 'العميل' },
    { key: 'vehiclePlate', label: 'السيارة' },
    { key: 'amount', label: 'المبلغ (ر.س)' },
    { key: 'method', label: 'طريقة الدفع' },
    { key: 'paidAt', label: 'تاريخ الدفع' },
    { key: 'notes', label: 'ملاحظات' },
  ];

  if (isLoading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">المدفوعات</h1>
      <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">المدفوعات</h1>
        <ExcelExport
          data={exportData}
          headers={exportHeaders}
          filename="مدفوعات"
          sheetName="المدفوعات"
          disabled={paymentsLoading}
          label={`تصدير Excel (${allPayments?.length ?? 0})`}
        />
      </div>
      <p className="text-muted-foreground">عرض المدفوعات حسب العقود. اضغط على العقد لعرض التفاصيل وتسجيل دفعات جديدة.</p>
      <div className="space-y-3">
        {contracts?.filter(c => c.status === 'active' || c.status === 'completed').map(c => {
          const customer = getCustomer(c.customerId);
          return (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => setLocation(`/contracts/${c.id}`)}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.contractNumber}</span>
                    <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status === 'active' ? 'نشط' : 'مكتمل'}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    العميل: {customer?.name || '-'} | الإجمالي: {Number(c.finalPrice || c.basePrice).toLocaleString('ar-SA')} ر.س
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!contracts || contracts.filter(c => c.status === 'active' || c.status === 'completed').length === 0) && (
          <div className="text-center py-12 text-muted-foreground">لا توجد عقود نشطة أو مكتملة</div>
        )}
      </div>
    </div>
  );
}
