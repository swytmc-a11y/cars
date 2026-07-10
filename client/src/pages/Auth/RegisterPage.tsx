import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";
import { Eye, EyeOff, Car, Loader2, Building2, CheckCircle, ArrowRight, Mail, User, Lock, Shield } from "lucide-react";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"form" | "success">("form");
  const { data: me } = trpc.auth.me.useQuery();
  useEffect(() => { if (me) setLocation("/"); }, [me]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: () => setStep("success"),
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("الاسم مطلوب"); return; }
    if (!email.trim()) { toast.error("البريد الإلكتروني مطلوب"); return; }
    if (password.length < 8) { toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    if (password !== confirmPassword) { toast.error("كلمة المرور وتأكيدها غير متطابقتين"); return; }
    if (!officeName.trim()) { toast.error("اسم المكتب مطلوب"); return; }
    registerMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      userType: "owner",
      officeName: officeName.trim(),
      role: "owner",
    });
  }

  const passwordStrength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 && !/[A-Z]/.test(password) ? 2
    : password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4
    : 3;
  const strengthColors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];
  const strengthLabels = ["", "ضعيفة", "مقبولة", "جيدة", "قوية"];

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-6">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">تم إنشاء مكتبك بنجاح!</h2>
          <p className="text-slate-400 mb-6">
            تم إنشاء مكتب <span className="text-blue-400 font-semibold">"{officeName}"</span> وحسابك كمالك.
            يمكنك الآن تسجيل الدخول وإدارة مكتبك وإضافة موظفيك من داخل النظام.
          </p>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 text-right">
            <p className="text-blue-300 text-sm font-semibold mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" /> صلاحياتك كمالك المكتب
            </p>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• إضافة وإدارة الموظفين من داخل النظام مباشرة</li>
              <li>• تحديد صلاحيات كل موظف</li>
              <li>• الوصول الكامل لجميع البيانات والتقارير</li>
            </ul>
          </div>
          <Button onClick={() => setLocation("/login")} className="bg-blue-600 hover:bg-blue-500 text-white px-8 h-11 w-full">
            الذهاب لتسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-2xl mb-4 border border-blue-500/30">
            <Car className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">إنشاء حساب مالك مكتب</h1>
          <p className="text-slate-400 text-sm">سجّل مكتبك وابدأ إدارة أسطولك الآن</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-6 flex items-start gap-3">
          <Building2 className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-amber-300 text-sm">
            هذه الصفحة مخصصة <strong>لملاك المكاتب فقط</strong>. إذا كنت موظفاً، تواصل مع مالك المكتب ليضيفك من داخل النظام.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm font-medium">الاسم الكامل</Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="أحمد محمد"
                className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 pr-10 h-11" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm font-medium">البريد الإلكتروني</Label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@example.com"
                className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 pr-10 h-11" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm font-medium">اسم المكتب</Label>
            <div className="relative">
              <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={officeName} onChange={e => setOfficeName(e.target.value)} placeholder="مكتب سمو لتأجير السيارات"
                className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 pr-10 h-11" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm font-medium">كلمة المرور</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 pr-10 pl-10 h-11" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex gap-1 flex-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= passwordStrength ? strengthColors[passwordStrength] : 'bg-white/10'}`} />
                  ))}
                </div>
                <span className="text-xs text-slate-400">{strengthLabels[passwordStrength]}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm font-medium">تأكيد كلمة المرور</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="أعد كتابة كلمة المرور"
                className={`bg-white/5 border-white/20 text-white placeholder:text-slate-500 pr-10 pl-10 h-11 ${confirmPassword && confirmPassword !== password ? 'border-red-500/50' : ''}`} required />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-red-400 text-xs">كلمتا المرور غير متطابقتين</p>
            )}
          </div>

          <Button type="submit" disabled={registerMutation.isPending}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold mt-2">
            {registerMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> جاري إنشاء الحساب...</>
              : <><Building2 className="h-4 w-4 ml-2" /> إنشاء حساب المكتب</>}
          </Button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-4">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1">
            تسجيل الدخول <ArrowRight className="h-3 w-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}
