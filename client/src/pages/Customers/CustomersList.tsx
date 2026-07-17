import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, Ban } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ExcelExport } from "@/components/ExcelExport";

export default function CustomersList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = trpc.customers.list.useQuery({ search: search || undefined });

  const exportData = (customers ?? []).map(c => ({
    name: c.name,
    phone: c.phone ?? '',
    idNumber: c.idNumber ?? '',
    licenseNumber: c.licenseNumber ?? '',
    email: c.email ?? '',
    city: c.city ?? '',
    address: c.address ?? '',
    isBlacklisted: c.isBlacklisted ? 'نعم' : 'لا',
    createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-SA') : '',
  }));

  const exportHeaders: { key: keyof typeof exportData[0]; label: string }[] = [
    { key: 'name', label: 'الاسم' },
    { key: 'phone', label: 'الهاتف' },
    { key: 'idNumber', label: 'رقم الهوية' },
    { key: 'licenseNumber', label: 'رقم الرخصة' },
    { key: 'email', label: 'البريد الإلكتروني' },
    { key: 'city', label: 'المدينة' },
    { key: 'address', label: 'العنوان' },
    { key: 'isBlacklisted', label: 'محظور' },
    { key: 'createdAt', label: 'تاريخ التسجيل' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">العملاء</h1>
        <div className="flex items-center gap-2">
          <ExcelExport
            data={exportData}
            headers={exportHeaders}
            filename="عملاء"
            sheetName="العملاء"
            disabled={isLoading}
          />
          <Button onClick={() => setLocation("/customers/new")}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة عميل
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="بحث بالاسم أو الهاتف أو رقم الهوية..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {customers?.map((customer) => (
            <Card key={customer.id} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/20" onClick={() => setLocation(`/customers/${customer.id}`)}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{customer.name}</span>
                    {customer.isBlacklisted && <Badge variant="destructive" className="text-xs"><Ban className="h-3 w-3 ml-1" />محظور</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground flex gap-4 mt-1">
                    <span>{customer.phone}</span>
                    {customer.idNumber && <span>هوية: {customer.idNumber}</span>}
                    {customer.city && <span>{customer.city}</span>}
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setLocation(`/customers/${customer.id}/profile`)}
                  >
                    الملف الشامل
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {customers?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">لا يوجد عملاء مطابقون للبحث</div>
          )}
        </div>
      )}
    </div>
  );
}
