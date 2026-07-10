import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, Car, Loader2, LogIn, Users } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvitePage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") ?? "";
  const [, setLocation] = useLocation();
  const [accepted, setAccepted] = useState(false);

  // Get current user
  const { data: me } = trpc.auth.me.useQuery();

  // Get invitation info
  const { data: invitation, isLoading, error } = trpc.invitations.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  // Accept mutation
  const acceptMutation = trpc.invitations.accept.useMutation({
    onSuccess: () => {
      setAccepted(true);
      toast.success("تم قبول الدعوة بنجاح! مرحباً بك في المكتب.");
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (e) => toast.error(e.message),
  });

  // If no token
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md bg-white/95">
          <CardContent className="p-8 text-center space-y-4">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">رابط غير صالح</h2>
            <p className="text-gray-500 text-sm">رابط الدعوة غير صحيح أو منتهي الصلاحية.</p>
            <Button onClick={() => setLocation("/login")} className="w-full">
              الذهاب لتسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center text-white space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-400" />
          <p className="text-slate-300">جاري التحقق من الدعوة...</p>
        </div>
      </div>
    );
  }

  // Invalid or expired invitation
  if (!invitation || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md bg-white/95">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">الدعوة غير صالحة</h2>
            <p className="text-gray-500 text-sm">
              هذه الدعوة منتهية الصلاحية أو تم إلغاؤها. تواصل مع مالك المكتب لإرسال دعوة جديدة.
            </p>
            <Button onClick={() => setLocation("/login")} className="w-full">
              الذهاب لتسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen
  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-md w-full space-y-6">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500/20 rounded-full">
            <CheckCircle className="h-12 w-12 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">مرحباً بك في {invitation.officeName}!</h2>
          <p className="text-slate-400">تم قبول الدعوة بنجاح. جاري تحويلك إلى لوحة التحكم...</p>
          <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
        </div>
      </div>
    );
  }

  const roleLabel = invitation.role === "admin" ? "مدير" : invitation.role === "accountant" ? "محاسب" : "موظف";
  const roleColor = invitation.role === "admin" ? "text-purple-400" : invitation.role === "accountant" ? "text-emerald-400" : "text-blue-400";
  const roleBg = invitation.role === "admin" ? "bg-purple-500/10 border-purple-500/20" : invitation.role === "accountant" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-blue-500/10 border-blue-500/20";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <Car className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">دعوة للانضمام</h1>
          <p className="text-slate-400 text-sm">لقد تلقيت دعوة للانضمام إلى نظام إدارة تأجير السيارات</p>
        </div>

        <Card className="border-slate-700/50 bg-slate-800/60 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-6 space-y-5">
            {/* Office Info */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto">
                <Users className="h-7 w-7 text-blue-400" />
              </div>
              <h2 className="text-white font-bold text-xl">{invitation.officeName}</h2>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${roleBg}`}>
                <span className={`text-sm font-semibold ${roleColor}`}>الدور: {roleLabel}</span>
              </div>
            </div>

            <div className="border-t border-slate-700/50" />

            {/* Invitation details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">البريد المدعو</span>
                <span className="text-white font-medium">{invitation.email}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">تنتهي في</span>
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(invitation.expiresAt).toLocaleDateString("ar-SA")}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-700/50" />

            {/* Action */}
            {me ? (
              // User is logged in - show accept button
              <div className="space-y-3">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                  <p className="text-blue-300 text-sm">
                    مرحباً <strong>{me.name}</strong>! اضغط قبول للانضمام إلى المكتب.
                  </p>
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11"
                  onClick={() => acceptMutation.mutate({ token })}
                  disabled={acceptMutation.isPending}
                >
                  {acceptMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري القبول...</>
                  ) : (
                    <><CheckCircle className="h-4 w-4 ml-2" />قبول الدعوة والانضمام</>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-slate-200"
                  onClick={() => setLocation("/")}
                >
                  تجاهل الدعوة
                </Button>
              </div>
            ) : (
              // User is not logged in - prompt to login or register
              <div className="space-y-3">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <p className="text-amber-300 text-sm text-center">
                    يجب تسجيل الدخول أو إنشاء حساب أولاً لقبول هذه الدعوة.
                  </p>
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11"
                  onClick={() => setLocation(`/login?redirect=/accept-invite?token=${token}`)}
                >
                  <LogIn className="h-4 w-4 ml-2" />
                  تسجيل الدخول لقبول الدعوة
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 h-11"
                  onClick={() => setLocation(`/register?redirect=/accept-invite?token=${token}`)}
                >
                  إنشاء حساب جديد
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
