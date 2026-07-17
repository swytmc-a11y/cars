import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Edit, Ban, ImageIcon, FileText, Calendar } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload";
import { useState } from "react";

export default function CustomerDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data, isLoading, refetch } = trpc.customers.getById.useQuery({ id: Number(params.id) });
  const utils = trpc.useUtils();

  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);

  const updateMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("تم التحديث");
      utils.customers.getById.invalidate({ id: Number(params.id) });
    },
  });

  const uploadImageMutation = trpc.customers.uploadImage.useMutation({
    onSuccess: () => {
      toast.success("تم رفع الصورة بنجاح");
      refetch();
    },
    onError: (e) => toast.error(`فشل رفع الصورة: ${e.message}`),
  });

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64" />
    </div>
  );
  if (!data) return <div className="text-center py-12 text-muted-foreground">العميل غير موجود</div>;

  const { customer, reservations, contracts } = data;

  async function handleImageUpload(type: 'id' | 'license', base64: string, mimeType: string) {
    if (type === 'id') setUploadingId(true);
    else setUploadingLicense(true);
    try {
      await uploadImageMutation.mutateAsync({
        customerId: customer.id,
        type,
        base64,
        mimeType,
      });
    } finally {
      if (type === 'id') setUploadingId(false);
      else setUploadingLicense(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/customers")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{customer.name}</h1>
        {customer.isBlacklisted && (
          <Badge variant="destructive">
            <Ban className="h-3 w-3 ml-1" />محظور
          </Badge>
        )}
        <div className="flex-1" />
        <Button variant="outline" onClick={() => setLocation(`/customers/${customer.id}/edit`)}>
          <Edit className="h-4 w-4 ml-2" />تعديل
        </Button>
        {!customer.isBlacklisted ? (
          <Button variant="destructive" size="sm" onClick={() => {
            const reason = prompt("سبب الحظر:");
            if (reason) updateMutation.mutate({ id: customer.id, isBlacklisted: true, blacklistReason: reason });
          }}>حظر العميل</Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() =>
            updateMutation.mutate({ id: customer.id, isBlacklisted: false, blacklistReason: "" })
          }>إلغاء الحظر</Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">رقم الهاتف</div>
            <div className="font-bold mt-1 text-lg">{customer.phone}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">رقم الهوية</div>
            <div className="font-bold mt-1 text-lg">{customer.idNumber || '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">رقم الرخصة</div>
            <div className="font-bold mt-1 text-lg">{customer.licenseNumber || '—'}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">المعلومات</TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            الوثائق
            {(customer.idImageUrl || customer.licenseImageUrl) && (
              <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                {[customer.idImageUrl, customer.licenseImageUrl].filter(Boolean).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reservations">
            الحجوزات ({reservations.length})
          </TabsTrigger>
          <TabsTrigger value="contracts">
            العقود ({contracts.length})
          </TabsTrigger>
        </TabsList>

        {/* Info tab */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">البريد الإلكتروني</div>
                <div className="font-medium mt-1">{customer.email || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">المدينة</div>
                <div className="font-medium mt-1">{customer.city || '—'}</div>
              </div>
              <div className="col-span-full">
                <div className="text-sm text-muted-foreground">العنوان</div>
                <div className="font-medium mt-1">{customer.address || '—'}</div>
              </div>
              {customer.isBlacklisted && (
                <div className="col-span-full bg-destructive/10 rounded-lg p-3">
                  <div className="text-sm font-medium text-destructive">سبب الحظر</div>
                  <div className="text-sm mt-1">{customer.blacklistReason}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-muted-foreground">تاريخ الإضافة</div>
                <div className="font-medium mt-1">{new Date(customer.createdAt).toLocaleDateString('ar-SA')}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents tab */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="h-4 w-4" />
                صور وثائق العميل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <ImageUpload
                    label="صورة الهوية الوطنية"
                    icon="id"
                    currentUrl={customer.idImageUrl || null}
                    onFileSelect={(base64, mimeType) => handleImageUpload('id', base64, mimeType)}
                    uploading={uploadingId}
                  />
                  {customer.idImageUrl && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                      تم رفع صورة الهوية
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <ImageUpload
                    label="صورة رخصة القيادة"
                    icon="license"
                    currentUrl={customer.licenseImageUrl || null}
                    onFileSelect={(base64, mimeType) => handleImageUpload('license', base64, mimeType)}
                    uploading={uploadingLicense}
                  />
                  {customer.licenseImageUrl && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                      تم رفع صورة الرخصة
                    </p>
                  )}
                </div>
              </div>

              {!customer.idImageUrl && !customer.licenseImageUrl && (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">لم يتم رفع أي وثائق بعد</p>
                  <p className="text-xs mt-1">اضغط على أي منطقة أعلاه لرفع الصورة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reservations tab */}
        <TabsContent value="reservations" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {reservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>لا توجد حجوزات</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reservations.map(r => (
                    <div key={r.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                      <div>
                        <div className="text-sm font-medium">حجز #{r.id}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.startDate).toLocaleDateString('ar-SA')} — {new Date(r.endDate).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {r.status === 'pending' ? 'معلق' : r.status === 'confirmed' ? 'مؤكد' : r.status === 'cancelled' ? 'ملغي' : 'مكتمل'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts tab */}
        <TabsContent value="contracts" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {contracts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>لا توجد عقود</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contracts.map(c => (
                    <div
                      key={c.id}
                      className="flex justify-between items-center border-b pb-3 last:border-0 cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors"
                      onClick={() => setLocation(`/contracts/${c.id}`)}
                    >
                      <div>
                        <div className="text-sm font-medium">{c.contractNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(c.startDate).toLocaleDateString('ar-SA')} — {new Date(c.endDate).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {c.status === 'active' ? 'نشط' : c.status === 'completed' ? 'مكتمل' : c.status === 'cancelled' ? 'ملغي' : 'مسودة'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
