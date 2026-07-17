import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Lock, Shield, Building2, Loader2, CheckCircle2 } from "lucide-react";

const roleLabels: Record<string, string> = {
  admin: "مدير عام",
  staff: "موظف",
  accountant: "محاسب",
};

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  staff: "bg-blue-100 text-blue-800 border-blue-200",
  accountant: "bg-green-100 text-green-800 border-green-200",
};

export default function ProfilePage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: profile, isLoading } = trpc.profile.get.useQuery();
  const { data: branches } = trpc.branches.list.useQuery();

  // Profile update state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileInitialized, setProfileInitialized] = useState(false);

  if (profile && !profileInitialized) {
    setName(profile.name ?? "");
    setEmail(profile.email ?? "");
    setProfileInitialized(true);
  }

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الملف الشخصي بنجاح");
      utils.profile.get.invalidate();
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const changePassword = trpc.profile.changePassword.useMutation({
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور بنجاح");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleUpdateProfile = () => {
    if (!name.trim()) return toast.error("الاسم مطلوب");
    updateProfile.mutate({ name: name.trim(), email: email.trim() || undefined });
  };

  const handleChangePassword = () => {
    if (!currentPassword) return toast.error("أدخل كلمة المرور الحالية");
    if (newPassword.length < 8) return toast.error("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
    if (newPassword !== confirmPassword) return toast.error("كلمة المرور الجديدة وتأكيدها غير متطابقتين");
    changePassword.mutate({ currentPassword, newPassword });
  };

  const branch = branches?.find(b => b.id === (profile as any)?.officeId);

  const passwordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = passwordStrength(newPassword);
  const strengthLabel = ["ضعيفة جداً", "ضعيفة", "متوسطة", "قوية", "قوية جداً"][strength];
  const strengthColor = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-emerald-600"][strength];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
          {(profile?.name ?? user?.name ?? "؟").charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile?.name ?? "—"}</h1>
          <p className="text-muted-foreground text-sm">{profile?.email ?? "—"}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`text-xs border ${roleColors[profile?.role ?? "staff"]}`}>
              <Shield className="w-3 h-3 ml-1" />
              {roleLabels[profile?.role ?? "staff"]}
            </Badge>
            {branch && (
              <Badge variant="outline" className="text-xs">
                <Building2 className="w-3 h-3 ml-1" />
                {branch.name}
              </Badge>
            )}
            {!profile?.isActive && (
              <Badge variant="destructive" className="text-xs">في انتظار التفعيل</Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="info" dir="rtl">
        <TabsList className="w-full">
          <TabsTrigger value="info" className="flex-1 gap-2">
            <User className="w-4 h-4" />
            البيانات الشخصية
          </TabsTrigger>
          <TabsTrigger value="password" className="flex-1 gap-2">
            <Lock className="w-4 h-4" />
            تغيير كلمة المرور
          </TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">تعديل البيانات الشخصية</CardTitle>
              <CardDescription>يمكنك تعديل اسمك وبريدك الإلكتروني</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="أدخل بريدك الإلكتروني"
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">الدور الوظيفي</Label>
                  <p className="text-sm font-medium">{roleLabels[profile?.role ?? "staff"]}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">الفرع</Label>
                  <p className="text-sm font-medium">{branch?.name ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">تاريخ الإنشاء</Label>
                  <p className="text-sm font-medium">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("ar-SA") : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">آخر تسجيل دخول</Label>
                  <p className="text-sm font-medium">
                    {profile?.lastSignedIn ? new Date(profile.lastSignedIn).toLocaleString("ar-SA") : "—"}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleUpdateProfile}
                disabled={updateProfile.isPending}
                className="w-full"
              >
                {updateProfile.isPending ? (
                  <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الحفظ...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 ml-2" /> حفظ التغييرات</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">تغيير كلمة المرور</CardTitle>
              <CardDescription>اختر كلمة مرور قوية تحتوي على أحرف وأرقام ورموز</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  dir="ltr"
                  className="text-right"
                />
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${i < strength ? strengthColor : "bg-muted"}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">قوة كلمة المرور: <span className="font-medium">{strengthLabel}</span></p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  dir="ltr"
                  className="text-right"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">كلمتا المرور غير متطابقتين</p>
                )}
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={changePassword.isPending}
                className="w-full"
              >
                {changePassword.isPending ? (
                  <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري التغيير...</>
                ) : (
                  <><Lock className="w-4 h-4 ml-2" /> تغيير كلمة المرور</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
