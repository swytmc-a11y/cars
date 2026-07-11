import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, LogOut, Car } from "lucide-react";
import { toast } from "sonner";

export default function PendingApprovalPage() {
  const logout = trpc.localAuth.logout.useMutation({
    onSuccess: () => { window.location.href = "/login"; },
    onError: () => { window.location.href = "/login"; },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-10 h-10 text-amber-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <Car className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">في انتظار الموافقة</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              تم إنشاء حسابك بنجاح. يحتاج الحساب إلى موافقة المدير قبل تمكنك من الدخول إلى النظام.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-right space-y-2">
            <p className="text-sm font-semibold text-amber-800">ماذا يحدث الآن؟</p>
            <ul className="text-xs text-amber-700 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                سيتلقى المدير إشعاراً بطلبك
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                سيقوم بتفعيل حسابك وتعيين صلاحياتك
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                يمكنك تسجيل الدخول بعد التفعيل
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                window.location.reload();
                toast.info("جاري التحقق من حالة الحساب...");
              }}
            >
              <Clock className="w-4 h-4" />
              التحقق من الحالة
            </Button>
            <Button
              variant="ghost"
              className="w-full gap-2 text-muted-foreground"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
