import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Eye, EyeOff, Car, Loader2, Lock, Mail } from "lucide-react";
import { useEffect } from "react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const utils = trpc.useUtils();

  // Redirect to dashboard if already authenticated
  const { data: me } = trpc.auth.me.useQuery();
  useEffect(() => { if (me) setLocation("/"); }, [me]);

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: async () => {
      toast.success("مرحباً بك! تم تسجيل الدخول بنجاح");
      await utils.auth.me.invalidate();
      setLocation("/");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    loginMutation.mutate({ email, password });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <Car className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">نظام تأجير السيارات</h1>
          <p className="text-slate-400 text-sm">سجّل دخولك للمتابعة</p>
        </div>

        <Card className="border-slate-700/50 bg-slate-800/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-2 pt-6 px-6">
            <div className="flex items-center gap-2 text-white">
              <Lock className="h-4 w-4 text-blue-400" />
              <span className="font-semibold">تسجيل الدخول</span>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="pr-9 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                    autoComplete="email"
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-9 pl-9 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                    autoComplete="current-password"
                    disabled={loginMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setLocation("/forgot-password")}
                  className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 mt-2 shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98]"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جاري تسجيل الدخول...</>
                ) : "دخول"}
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-slate-700 text-center">
              <p className="text-slate-400 text-sm">
                ليس لديك حساب؟{" "}
                <button
                  onClick={() => setLocation("/register")}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  إنشاء حساب جديد
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-600 text-xs mt-6">
          جميع الحقوق محفوظة © {new Date().getFullYear()} نظام تأجير السيارات
        </p>
      </div>
    </div>
  );
}
