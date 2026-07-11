import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Phone, Mail, MapPin, Car, FileText, CreditCard,
  ArrowRight, AlertCircle, Calendar, DollarSign, Clock,
  CheckCircle2, XCircle, Image as ImageIcon, Shield, TrendingUp
} from "lucide-react";

const contractStatusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "bg-slate-100 text-slate-700" },
  active: { label: "نشط", color: "bg-green-100 text-green-700" },
  completed: { label: "مكتمل", color: "bg-blue-100 text-blue-700" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-700" },
  overdue: { label: "متأخر", color: "bg-amber-100 text-amber-700" },
};

const paymentMethodMap: Record<string, string> = {
  cash: "نقد",
  card: "بطاقة",
  bank_transfer: "تحويل بنكي",
  check: "شيك",
};

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const customerId = parseInt(id ?? "0");

  const { data, isLoading, error } = trpc.customerProfile.getFullProfile.useQuery(
    { customerId },
    { enabled: !!customerId }
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-slate-600">لم يتم العثور على بيانات العميل</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/customers")}>
          <ArrowRight className="h-4 w-4 ml-2" /> العودة للقائمة
        </Button>
      </div>
    );
  }

  const { customer, contracts, reservations, payments, stats, rentedVehicles = [] } = data;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/customers")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{customer.name}</h1>
            <p className="text-slate-500 text-sm">ملف العميل الشامل</p>
          </div>
        </div>
        <div className="flex gap-2">
          {customer.isBlacklisted && (
            <Badge className="bg-red-100 text-red-700 border-red-200">
              <AlertCircle className="h-3 w-3 ml-1" /> قائمة سوداء
            </Badge>
          )}
          <Button variant="outline" onClick={() => setLocation(`/customers/${customerId}/edit`)}>
            تعديل البيانات
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.totalContracts}</p>
                <p className="text-xs text-blue-600">إجمالي العقود</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{stats.completedContracts}</p>
                <p className="text-xs text-green-600">عقود مكتملة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Car className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{stats.activeContracts}</p>
                <p className="text-xs text-amber-600">عقود نشطة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700">
                  {stats.totalSpent.toLocaleString("ar-SA")}
                </p>
                <p className="text-xs text-purple-600">إجمالي المدفوعات (ر.س)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              البيانات الشخصية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Shield className="h-4 w-4 text-slate-400" />
              <span className="text-slate-500">رقم الهوية:</span>
              <span className="font-medium text-slate-800">{customer.idNumber ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Car className="h-4 w-4 text-slate-400" />
              <span className="text-slate-500">رقم الرخصة:</span>
              <span className="font-medium text-slate-800">{customer.licenseNumber ?? "—"}</span>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>{customer.phone ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>{customer.email ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>{customer.city ?? customer.address ?? "—"}</span>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-slate-500">تاريخ التسجيل:</span>
              <span className="font-medium text-slate-800">
                {new Date(customer.createdAt).toLocaleDateString("ar-SA")}
              </span>
            </div>

            {/* Document Images */}
            {(customer.idImageUrl || customer.licenseImageUrl) && (
              <>
                <Separator />
                <p className="text-slate-500 font-medium flex items-center gap-1">
                  <ImageIcon className="h-4 w-4" /> صور الوثائق
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {customer.idImageUrl && (
                    <a href={customer.idImageUrl} target="_blank" rel="noopener noreferrer">
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors">
                        <img
                          src={customer.idImageUrl}
                          alt="صورة الهوية"
                          className="w-full h-20 object-cover"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs text-center py-1">
                          الهوية
                        </div>
                      </div>
                    </a>
                  )}
                  {customer.licenseImageUrl && (
                    <a href={customer.licenseImageUrl} target="_blank" rel="noopener noreferrer">
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors">
                        <img
                          src={customer.licenseImageUrl}
                          alt="صورة الرخصة"
                          className="w-full h-20 object-cover"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs text-center py-1">
                          الرخصة
                        </div>
                      </div>
                    </a>
                  )}
                </div>
              </>
            )}

            {/* Blacklist info */}
            {customer.isBlacklisted && customer.blacklistReason && (
              <>
                <Separator />
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-xs font-medium mb-1">سبب الإدراج في القائمة السوداء:</p>
                  <p className="text-red-600 text-xs">{customer.blacklistReason}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

            {/* Tabs: Contracts, Reservations, Payments, Vehicles */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="contracts">
            <TabsList className="w-full grid grid-cols-4 bg-slate-100">
              <TabsTrigger value="contracts" className="text-xs">
                <FileText className="h-3.5 w-3.5 ml-1" />
                العقود ({contracts.length})
              </TabsTrigger>
              <TabsTrigger value="vehicles" className="text-xs">
                <Car className="h-3.5 w-3.5 ml-1" />
                السيارات ({rentedVehicles.length})
              </TabsTrigger>
              <TabsTrigger value="reservations" className="text-xs">
                <Calendar className="h-3.5 w-3.5 ml-1" />
                الحجوزات ({reservations.length})
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-xs">
                <CreditCard className="h-3.5 w-3.5 ml-1" />
                المدفوعات ({payments.length})
              </TabsTrigger>
            </TabsList>

            {/* Vehicles Tab */}
            <TabsContent value="vehicles" className="mt-4">
              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {rentedVehicles.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Car className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p>لا توجد سيارات مستأجرة لهذا العميل</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {rentedVehicles.map((vehicle: any) => (
                        <div
                          key={vehicle.id}
                          className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setLocation(`/vehicles/${vehicle.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                              <Car className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-800">
                                {vehicle.make} {vehicle.model} {vehicle.year}
                              </p>
                              <p className="text-xs text-slate-500">
                                {vehicle.plateNumber} • {vehicle.color ?? ''}
                              </p>
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold text-slate-700">
                                {Number(vehicle.dailyRate).toLocaleString('ar-SA')} ر.س/يوم
                              </p>
                              <Badge className="text-xs bg-slate-100 text-slate-600">
                                {vehicle.status === 'available' ? 'متاح' :
                                 vehicle.status === 'rented' ? 'مؤجرة' :
                                 vehicle.status === 'maintenance' ? 'صيانة' : vehicle.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contracts Tab */}
            <TabsContent value="contracts" className="mt-4">
              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {contracts.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p>لا توجد عقود لهذا العميل</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {contracts.map((contract: any) => (
                        <div
                          key={contract.id}
                          className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setLocation(`/contracts/${contract.id}`)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-blue-600">
                                {contract.contractNumber}
                              </span>
                              <Badge className={`text-xs ${contractStatusMap[contract.status]?.color ?? "bg-slate-100 text-slate-700"}`}>
                                {contractStatusMap[contract.status]?.label ?? contract.status}
                              </Badge>
                            </div>
                            <span className="text-sm font-semibold text-slate-700">
                              {Number(contract.totalAmount).toLocaleString("ar-SA")} ر.س
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(contract.startDate).toLocaleDateString("ar-SA")}
                              {" → "}
                              {new Date(contract.endDate).toLocaleDateString("ar-SA")}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              مدفوع: {Number(contract.paidAmount ?? 0).toLocaleString("ar-SA")} ر.س
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reservations Tab */}
            <TabsContent value="reservations" className="mt-4">
              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {reservations.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p>لا توجد حجوزات لهذا العميل</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {reservations.map((res: any) => (
                        <div key={res.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-700 text-sm">
                              حجز #{res.id}
                            </span>
                            <Badge className="text-xs bg-slate-100 text-slate-700">
                              {res.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(res.startDate).toLocaleDateString("ar-SA")}
                              {" → "}
                              {new Date(res.endDate).toLocaleDateString("ar-SA")}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {Number(res.totalAmount ?? 0).toLocaleString("ar-SA")} ر.س
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="mt-4">
              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {payments.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p>لا توجد مدفوعات لهذا العميل</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {payments.map((payment: any) => (
                        <div key={payment.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-700">
                                  {Number(payment.amount).toLocaleString("ar-SA")} ر.س
                                </p>
                                <p className="text-xs text-slate-500">
                                  {paymentMethodMap[payment.paymentMethod] ?? payment.paymentMethod}
                                </p>
                              </div>
                            </div>
                            <div className="text-left">
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(payment.paidAt ?? payment.createdAt).toLocaleDateString("ar-SA")}
                              </p>
                              {payment.receiptNumber && (
                                <p className="text-xs text-blue-500 font-mono">#{payment.receiptNumber}</p>
                              )}
                            </div>
                          </div>
                          {payment.notes && (
                            <p className="text-xs text-slate-400 mt-1 mr-10">{payment.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
