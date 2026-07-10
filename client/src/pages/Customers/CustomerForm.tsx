import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, ImageIcon } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload";

type ImageState = { base64: string; mimeType: string } | null;

export default function CustomerForm() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const isEdit = !!params.id;
  const { data: customerData } = trpc.customers.getById.useQuery(
    { id: Number(params.id) },
    { enabled: isEdit }
  );

  const [form, setForm] = useState({
    name: "", idNumber: "", licenseNumber: "", phone: "",
    email: "", address: "", city: "",
  });

  // Image states for new uploads
  const [idImage, setIdImage] = useState<ImageState>(null);
  const [licenseImage, setLicenseImage] = useState<ImageState>(null);

  // Existing image URLs (from DB)
  const [existingIdUrl, setExistingIdUrl] = useState<string | null>(null);
  const [existingLicenseUrl, setExistingLicenseUrl] = useState<string | null>(null);

  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);

  useEffect(() => {
    if (customerData?.customer) {
      const c = customerData.customer;
      setForm({
        name: c.name,
        idNumber: c.idNumber || "",
        licenseNumber: c.licenseNumber || "",
        phone: c.phone,
        email: c.email || "",
        address: c.address || "",
        city: c.city || "",
      });
      setExistingIdUrl(c.idImageUrl || null);
      setExistingLicenseUrl(c.licenseImageUrl || null);
    }
  }, [customerData]);

  const utils = trpc.useUtils();

  const uploadImageMutation = trpc.customers.uploadImage.useMutation({
    onError: (e) => toast.error(`فشل رفع الصورة: ${e.message}`),
  });

  const createMutation = trpc.customers.create.useMutation({
    onSuccess: async (data) => {
      // Upload images after customer is created
      const uploads: Promise<void>[] = [];

      if (idImage) {
        setUploadingId(true);
        uploads.push(
          uploadImageMutation.mutateAsync({
            customerId: data.id!,
            type: 'id',
            base64: idImage.base64,
            mimeType: idImage.mimeType,
          }).then(() => setUploadingId(false)).catch(() => setUploadingId(false))
        );
      }

      if (licenseImage) {
        setUploadingLicense(true);
        uploads.push(
          uploadImageMutation.mutateAsync({
            customerId: data.id!,
            type: 'license',
            base64: licenseImage.base64,
            mimeType: licenseImage.mimeType,
          }).then(() => setUploadingLicense(false)).catch(() => setUploadingLicense(false))
        );
      }

      await Promise.all(uploads);
      toast.success("تم إضافة العميل بنجاح");
      utils.customers.list.invalidate();
      setLocation("/customers");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.customers.update.useMutation({
    onSuccess: async () => {
      const customerId = Number(params.id);
      const uploads: Promise<void>[] = [];

      if (idImage) {
        setUploadingId(true);
        uploads.push(
          uploadImageMutation.mutateAsync({
            customerId,
            type: 'id',
            base64: idImage.base64,
            mimeType: idImage.mimeType,
          }).then(() => setUploadingId(false)).catch(() => setUploadingId(false))
        );
      }

      if (licenseImage) {
        setUploadingLicense(true);
        uploads.push(
          uploadImageMutation.mutateAsync({
            customerId,
            type: 'license',
            base64: licenseImage.base64,
            mimeType: licenseImage.mimeType,
          }).then(() => setUploadingLicense(false)).catch(() => setUploadingLicense(false))
        );
      }

      await Promise.all(uploads);
      toast.success("تم تحديث العميل بنجاح");
      utils.customers.list.invalidate();
      setLocation("/customers");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Sanitize empty strings
    const sanitized = {
      ...form,
      idNumber: form.idNumber.trim() || undefined,
      licenseNumber: form.licenseNumber.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
    };
    if (isEdit) updateMutation.mutate({ id: Number(params.id), ...sanitized });
    else createMutation.mutate(sanitized as any);
  };

  const isBusy = createMutation.isPending || updateMutation.isPending || uploadingId || uploadingLicense;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/customers")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? "تعديل العميل" : "إضافة عميل جديد"}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>البيانات الشخصية</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم الكامل *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="أحمد محمد العلي" />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف *</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required placeholder="05xxxxxxxx" />
              </div>
              <div className="space-y-2">
                <Label>رقم الهوية الوطنية</Label>
                <Input value={form.idNumber} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))} placeholder="1xxxxxxxxx" />
              </div>
              <div className="space-y-2">
                <Label>رقم رخصة القيادة</Label>
                <Input value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="رقم الرخصة" />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="example@email.com" />
              </div>
              <div className="space-y-2">
                <Label>المدينة</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="الرياض" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>العنوان التفصيلي</Label>
              <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="الحي، الشارع، رقم المبنى..." rows={2} />
            </div>

            <Separator />

            {/* Document Images */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium text-sm">صور الوثائق</h3>
                <span className="text-xs text-muted-foreground">(اختياري - يمكن إضافتها لاحقاً)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUpload
                  label="صورة الهوية الوطنية"
                  icon="id"
                  currentUrl={idImage ? undefined : existingIdUrl}
                  onFileSelect={(base64, mimeType) => setIdImage({ base64, mimeType })}
                  onRemove={() => { setIdImage(null); setExistingIdUrl(null); }}
                  uploading={uploadingId}
                />
                <ImageUpload
                  label="صورة رخصة القيادة"
                  icon="license"
                  currentUrl={licenseImage ? undefined : existingLicenseUrl}
                  onFileSelect={(base64, mimeType) => setLicenseImage({ base64, mimeType })}
                  onRemove={() => { setLicenseImage(null); setExistingLicenseUrl(null); }}
                  uploading={uploadingLicense}
                />
              </div>
              {(idImage || licenseImage) && (
                <p className="text-xs text-muted-foreground bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                  سيتم رفع الصور تلقائياً بعد حفظ بيانات العميل
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isBusy}>
                {isBusy ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إضافة العميل"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setLocation("/customers")}>إلغاء</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
