import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, Mail, CheckCircle2, Car, KeyRound, ShieldCheck, Lock } from "lucide-react";
import { Link, useLocation } from "wouter";

type Step = "email" | "otp" | "reset" | "done";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const requestOtp = trpc.localAuth.requestOtp.useMutation({
    onSuccess: () => {
      setStep("otp");
      toast.success("تم إرسال الكود على بريدك الإلكتروني");
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyOtp = trpc.localAuth.verifyOtp.useMutation({
    onSuccess: (data) => {
      setResetToken(data.resetToken);
      setStep("reset");
    },
    onError: (err) => {
      toast.error(err.message);
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    },
  });

  const resetWithOtp = trpc.localAuth.resetWithOtp.useMutation({
    onSuccess: () => {
      setStep("done");
      setTimeout(() => setLocation("/login"), 2500);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── OTP input helpers ──────────────────────────────────────────────────────
  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index < 5) inputRefs.current[index + 1]?.focus();
    if (e.key === "ArrowRight" && index > 0) inputRefs.current[index - 1]?.focus();
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  }

  // ── Submit handlers ────────────────────────────────────────────────────────
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("أدخل البريد الإلكتروني"); return; }
    requestOtp.mutate({ email });
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) { toast.error("أدخل الكود المكون من 6 أرقام"); return; }
    verifyOtp.mutate({ email, code });
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    if (newPassword !== confirmPassword) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    resetWithOtp.mutate({ resetToken, newPassword });
  };

  // ── Step indicator ─────────────────────────────────────────────────────────
  const steps = [
    { id: "email", label: "البريد", icon: Mail },
    { id: "otp", label: "الكود", icon: ShieldCheck },
    { id: "reset", label: "كلمة المرور", icon: Lock },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      dir="rtl"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-500/30">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">إدارة التأجير</h1>
          <p className="text-slate-400 text-sm mt-1">استعادة كلمة المرور</p>
        </div>

        {/* Step indicator */}
        {step !== "done" && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((s, i) => {
              const isActive = s.id === step;
              const isDone = steps.findIndex(x => x.id === step) > i;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive ? "bg-blue-600 text-white" :
                    isDone ? "bg-green-600/20 text-green-400" :
                    "bg-slate-700 text-slate-500"
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {s.label}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`h-px w-6 ${isDone ? "bg-green-600/40" : "bg-slate-700"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-400" />
              {step === "email" && "نسيت كلمة المرور؟"}
              {step === "otp" && "أدخل كود التحقق"}
              {step === "reset" && "كلمة المرور الجديدة"}
              {step === "done" && "تم بنجاح!"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {step === "email" && "أدخل بريدك الإلكتروني وسنرسل لك كود التحقق"}
              {step === "otp" && `أرسلنا كوداً من 6 أرقام إلى ${email}`}
              {step === "reset" && "اختر كلمة مرور جديدة قوية"}
              {step === "done" && "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* ── Step 1: Email ── */}
            {step === "email" && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300 text-sm">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 pr-10 focus:border-blue-500"
                      dir="ltr"
                      autoFocus
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-11"
                  disabled={requestOtp.isPending}
                >
                  {requestOtp.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جارٍ الإرسال...
                    </span>
                  ) : "إرسال كود التحقق"}
                </Button>
              </form>
            )}

            {/* ── Step 2: OTP ── */}
            {step === "otp" && (
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-slate-300 text-sm">كود التحقق (6 أرقام)</Label>
                  {/* OTP boxes — LTR order for digits */}
                  <div className="flex gap-2 justify-center" dir="ltr" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`w-12 h-14 text-center text-xl font-bold rounded-lg border-2 bg-slate-700/50 text-white outline-none transition-all ${
                          digit ? "border-blue-500 bg-blue-500/10" : "border-slate-600 focus:border-blue-400"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-slate-500 text-xs text-center">الكود صالح لمدة 10 دقائق فقط</p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-11"
                  disabled={verifyOtp.isPending || otp.join("").length !== 6}
                >
                  {verifyOtp.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جارٍ التحقق...
                    </span>
                  ) : "تحقق من الكود"}
                </Button>

                <button
                  type="button"
                  className="w-full text-slate-400 hover:text-blue-400 text-sm transition-colors"
                  onClick={() => requestOtp.mutate({ email })}
                  disabled={requestOtp.isPending}
                >
                  لم يصلك الكود؟ أعد الإرسال
                </button>
              </form>
            )}

            {/* ── Step 3: New Password ── */}
            {step === "reset" && (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">كلمة المرور الجديدة</Label>
                  <Input
                    type="password"
                    placeholder="8 أحرف على الأقل"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">تأكيد كلمة المرور</Label>
                  <Input
                    type="password"
                    placeholder="أعد إدخال كلمة المرور"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 ${
                      confirmPassword && confirmPassword !== newPassword ? "border-red-500" : ""
                    }`}
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-red-400 text-xs">كلمتا المرور غير متطابقتين</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-11"
                  disabled={resetWithOtp.isPending}
                >
                  {resetWithOtp.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جارٍ الحفظ...
                    </span>
                  ) : "حفظ كلمة المرور الجديدة"}
                </Button>
              </form>
            )}

            {/* ── Step 4: Done ── */}
            {step === "done" && (
              <div className="text-center py-4 space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                </div>
                <div>
                  <p className="text-white font-medium text-lg">تم تغيير كلمة المرور بنجاح!</p>
                  <p className="text-slate-400 text-sm mt-1">سيتم تحويلك لصفحة تسجيل الدخول...</p>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1 overflow-hidden">
                  <div className="bg-green-500 h-1 rounded-full animate-[progress_2.5s_linear_forwards]" style={{ width: "100%", animation: "none", transition: "width 2.5s linear" }} />
                </div>
              </div>
            )}

            {step !== "done" && (
              <div className="mt-6 text-center">
                <Link href="/login" className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center gap-1 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                  العودة لتسجيل الدخول
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
