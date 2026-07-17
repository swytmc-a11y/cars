import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Users, Shield, Building2, CheckCircle, XCircle, Clock, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const roleLabels: Record<string, string> = {
  admin: "مدير عام",
  staff: "موظف",
  accountant: "محاسب",
  user: "مستخدم",
};

const roleBadgeColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 border-red-200",
  staff: "bg-blue-100 text-blue-800 border-blue-200",
  accountant: "bg-purple-100 text-purple-800 border-purple-200",
  user: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function UsersManagement() {
  const { data: users = [], isLoading } = trpc.users.list.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const utils = trpc.useUtils();

  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("تم تحديث المستخدم بنجاح");
    },
    onError: (err) => toast.error(err.message),
  });

  const pendingUsers = users.filter(u => !u.isActive);
  const activeUsers = users.filter(u => u.isActive);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  const UserCard = ({ user, isPending = false }: { user: typeof users[0]; isPending?: boolean }) => (
    <Card key={user.id} className={`transition-all ${isPending ? "border-amber-200 bg-amber-50/30" : ""}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* User info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className={`text-sm font-medium ${isPending ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}`}>
                {user.name?.charAt(0)?.toUpperCase() || "م"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{user.name || "بدون اسم"}</span>
                {isPending && (
                  <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 border gap-1">
                    <Clock className="w-3 h-3" />
                    بانتظار التفعيل
                  </Badge>
                )}
                {!isPending && (
                  <Badge className={`text-xs border ${roleBadgeColors[user.role] ?? ""}`}>
                    {roleLabels[user.role] ?? user.role}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground truncate">{user.email || "-"}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                انضم: {new Date(user.createdAt).toLocaleDateString("ar-SA")}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isPending ? (
              /* Pending: show activate with role selection */
              <>
                <Select
                  defaultValue="staff"
                  onValueChange={(role) => {
                    updateUser.mutate({ id: user.id, role: role as any, isActive: true });
                  }}
                >
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <SelectValue placeholder="اختر الدور وفعّل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير عام</SelectItem>
                    <SelectItem value="staff">موظف</SelectItem>
                    <SelectItem value="accountant">محاسب</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-green-600 hover:bg-green-700"
                  onClick={() => updateUser.mutate({ id: user.id, isActive: true, role: "staff" })}
                  disabled={updateUser.isPending}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  تفعيل
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => {
                    if (confirm(`هل تريد رفض حساب ${user.name || user.email}؟`)) {
                      // We keep the account but mark it inactive - admin can always re-enable
                      toast.info("تم رفض الطلب - يمكنك تفعيله لاحقاً من قائمة المستخدمين");
                    }
                  }}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  رفض
                </Button>
              </>
            ) : (
              /* Active: show role, branch, and deactivate */
              <>
                <Select
                  value={user.role}
                  onValueChange={(value) => updateUser.mutate({ id: user.id, role: value as any })}
                >
                  <SelectTrigger className="w-32 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير عام</SelectItem>
                    <SelectItem value="staff">موظف</SelectItem>
                    <SelectItem value="accountant">محاسب</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={String((user as any).officeId || "")}
                  onValueChange={(value) => updateUser.mutate({ id: user.id })}
                >
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <SelectValue placeholder="اختر الفرع" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {b.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => updateUser.mutate({ id: user.id, isActive: false })}
                  disabled={updateUser.isPending}
                >
                  تعطيل
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Pending Accounts */}
      {pendingUsers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <h3 className="font-semibold text-amber-700">طلبات التسجيل المعلقة</h3>
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs">{pendingUsers.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            هذه الحسابات تنتظر موافقتك. اختر الدور المناسب وانقر "تفعيل" لمنح الوصول.
          </p>
          <div className="space-y-2">
            {pendingUsers.map(user => <UserCard key={user.id} user={user} isPending />)}
          </div>
          <Separator />
        </div>
      )}

      {/* Active Users */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">المستخدمون النشطون</h3>
            <Badge variant="secondary" className="text-xs">{activeUsers.length}</Badge>
          </div>
        </div>

        {activeUsers.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 border rounded-lg bg-muted/20">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>لا يوجد مستخدمون نشطون بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeUsers.map(user => <UserCard key={user.id} user={user} />)}
          </div>
        )}
      </div>

      {users.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">لا يوجد مستخدمون مسجلون</p>
          <p className="text-sm mt-1">عندما يسجل موظف حساباً، سيظهر هنا بانتظار موافقتك</p>
        </div>
      )}
    </div>
  );
}
