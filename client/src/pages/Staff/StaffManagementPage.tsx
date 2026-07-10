import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Users, UserPlus, RefreshCw, CheckCircle, Trash2,
  Shield, Briefcase, Calculator, Crown, Settings, Eye, EyeOff, Lock, Mail, User, KeyRound
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const ROLE_CONFIG = {
  owner: { label: "مالك المكتب", icon: Crown, color: "bg-amber-100 text-amber-800 border-amber-200" },
  admin: { label: "مدير فرع", icon: Shield, color: "bg-purple-100 text-purple-800 border-purple-200" },
  staff: { label: "موظف", icon: Briefcase, color: "bg-blue-100 text-blue-800 border-blue-200" },
  accountant: { label: "محاسب", icon: Calculator, color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

const PERMISSIONS_LABELS: Record<string, string> = {
  view_dashboard: "عرض لوحة التحكم",
  view_vehicles: "عرض السيارات",
  create_vehicles: "إضافة سيارات",
  edit_vehicles: "تعديل السيارات",
  delete_vehicles: "حذف السيارات",
  view_customers: "عرض العملاء",
  create_customers: "إضافة عملاء",
  edit_customers: "تعديل العملاء",
  delete_customers: "حذف العملاء",
  view_contracts: "عرض العقود",
  create_contracts: "إنشاء عقود",
  edit_contracts: "تعديل العقود",
  delete_contracts: "حذف العقود",
  view_payments: "عرض المدفوعات",
  create_payments: "إضافة مدفوعات",
  view_maintenance: "عرض الصيانة",
  create_maintenance: "إضافة صيانة",
  edit_maintenance: "تعديل الصيانة",
  view_reports: "عرض التقارير",
  manage_branches: "إدارة الفروع",
  manage_staff: "إدارة الموظفين",
};

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  admin: {
    view_dashboard: true, view_vehicles: true, create_vehicles: true, edit_vehicles: true, delete_vehicles: true,
    view_customers: true, create_customers: true, edit_customers: true, delete_customers: false,
    view_contracts: true, create_contracts: true, edit_contracts: true, delete_contracts: false,
    view_payments: true, create_payments: true,
    view_maintenance: true, create_maintenance: true, edit_maintenance: true,
    view_reports: true, manage_branches: true, manage_staff: false,
  },
  staff: {
    view_dashboard: true, view_vehicles: true, create_vehicles: false, edit_vehicles: false, delete_vehicles: false,
    view_customers: true, create_customers: true, edit_customers: true, delete_customers: false,
    view_contracts: true, create_contracts: true, edit_contracts: true, delete_contracts: false,
    view_payments: true, create_payments: true,
    view_maintenance: true, create_maintenance: false, edit_maintenance: false,
    view_reports: false, manage_branches: false, manage_staff: false,
  },
  accountant: {
    view_dashboard: true, view_vehicles: true, create_vehicles: false, edit_vehicles: false, delete_vehicles: false,
    view_customers: true, create_customers: false, edit_customers: false, delete_customers: false,
    view_contracts: true, create_contracts: false, edit_contracts: false, delete_contracts: false,
    view_payments: true, create_payments: true,
    view_maintenance: false, create_maintenance: false, edit_maintenance: false,
    view_reports: true, manage_branches: false, manage_staff: false,
  },
};

export default function StaffManagementPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isOwner = user?.role === "owner";

  // Data
  const { data: members = [], isLoading: loadingMembers } = trpc.office.members.useQuery();

  // Add Employee Dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [showEmpPassword, setShowEmpPassword] = useState(false);
  const [empRole, setEmpRole] = useState<"admin" | "staff" | "accountant">("staff");
  const [empPermissions, setEmpPermissions] = useState<Record<string, boolean>>(DEFAULT_PERMISSIONS.staff);

  // Edit permissions dialog
  const [editMember, setEditMember] = useState<any>(null);
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [editRole, setEditRole] = useState<"admin" | "staff" | "accountant">("staff");

  // Reset password dialog
  const [resetMember, setResetMember] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Mutations
  const createEmployeeMutation = trpc.localAuth.createEmployee.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الموظف بنجاح! يمكنه تسجيل الدخول الآن.");
      setShowAddDialog(false);
      resetAddForm();
      utils.office.members.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMemberMutation = trpc.office.updateMember.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث صلاحيات الموظف");
      setEditMember(null);
      utils.office.members.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMemberMutation = trpc.office.removeMember.useMutation({
    onSuccess: () => {
      toast.success("تم إزالة الموظف من المكتب");
      utils.office.members.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPasswordMutation = trpc.localAuth.updateEmployeePassword.useMutation({
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور بنجاح");
      setResetMember(null);
      setNewPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  function resetAddForm() {
    setEmpName(""); setEmpEmail(""); setEmpPassword("");
    setEmpRole("staff"); setEmpPermissions(DEFAULT_PERMISSIONS.staff);
  }

  function handleEmpRoleChange(role: "admin" | "staff" | "accountant") {
    setEmpRole(role);
    setEmpPermissions(DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS.staff);
  }

  function openEditMember(member: any) {
    setEditMember(member);
    const perms = typeof member.permissions === "string"
      ? JSON.parse(member.permissions)
      : member.permissions ?? DEFAULT_PERMISSIONS[member.role] ?? DEFAULT_PERMISSIONS.staff;
    setEditPermissions(perms);
    setEditRole(member.role === "owner" ? "admin" : member.role);
  }

  // Only owner can access this page
  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" dir="rtl">
        <Shield className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">غير مصرح بالوصول</h2>
        <p className="text-gray-400">هذه الصفحة متاحة لمالك المكتب فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الموظفين</h1>
          <p className="text-gray-500 text-sm mt-1">أضف موظفيك وحدد صلاحياتهم مباشرة</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          إضافة موظف جديد
        </Button>
      </div>

      {/* Members List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-blue-600" />
            أعضاء المكتب ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">لا يوجد موظفون بعد</p>
              <p className="text-sm">اضغط "إضافة موظف جديد" لإضافة أول موظف في مكتبك.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member: any) => {
                const roleConf = ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.staff;
                const RoleIcon = roleConf.icon;
                const isMe = member.userId === (user as any)?.id;
                return (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                        {(member.name ?? "؟").charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {member.name ?? "—"}
                          {isMe && <span className="text-xs text-blue-500 mr-1">(أنت)</span>}
                        </p>
                        <p className="text-gray-500 text-xs">{member.email ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs border ${roleConf.color} gap-1`}>
                        <RoleIcon className="h-3 w-3" />
                        {roleConf.label}
                      </Badge>
                      {!isMe && member.role !== "owner" && (
                        <div className="flex gap-1">
                          {/* Edit permissions */}
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                            onClick={() => openEditMember(member)} title="تعديل الصلاحيات">
                            <Settings className="h-4 w-4" />
                          </Button>
                          {/* Reset password */}
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-amber-600"
                            onClick={() => { setResetMember(member); setNewPassword(""); }} title="تغيير كلمة المرور">
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          {/* Remove */}
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                            onClick={() => {
                              if (confirm(`هل تريد إزالة ${member.name} من المكتب؟`)) {
                                removeMemberMutation.mutate({ userId: member.userId });
                              }
                            }} title="إزالة من المكتب">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Employee Dialog ─────────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetAddForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              إضافة موظف جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <User className="h-4 w-4 text-gray-400" /> الاسم الكامل *
              </Label>
              <Input placeholder="أحمد محمد" value={empName} onChange={e => setEmpName(e.target.value)} />
            </div>
            {/* Email */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Mail className="h-4 w-4 text-gray-400" /> البريد الإلكتروني *
              </Label>
              <Input type="email" placeholder="employee@example.com" value={empEmail} onChange={e => setEmpEmail(e.target.value)} />
            </div>
            {/* Password */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Lock className="h-4 w-4 text-gray-400" /> كلمة المرور *
              </Label>
              <div className="relative">
                <Input
                  type={showEmpPassword ? "text" : "password"}
                  placeholder="6 أحرف على الأقل"
                  value={empPassword}
                  onChange={e => setEmpPassword(e.target.value)}
                  className="pl-10"
                />
                <button type="button" onClick={() => setShowEmpPassword(!showEmpPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showEmpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400">سيستخدم الموظف هذه البيانات لتسجيل الدخول مباشرة.</p>
            </div>
            {/* Role */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الدور الوظيفي *</Label>
              <Select value={empRole} onValueChange={(v) => handleEmpRoleChange(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير فرع</SelectItem>
                  <SelectItem value="staff">موظف</SelectItem>
                  <SelectItem value="accountant">محاسب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Permissions */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Shield className="h-4 w-4 text-blue-500" /> الصلاحيات
              </Label>
              <div className="bg-gray-50 rounded-lg p-3 max-h-52 overflow-y-auto space-y-2 border border-gray-100">
                {Object.entries(PERMISSIONS_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}</span>
                    <Switch
                      checked={empPermissions[key] ?? false}
                      onCheckedChange={(v) => setEmpPermissions(prev => ({ ...prev, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetAddForm(); }}>إلغاء</Button>
            <Button
              onClick={() => createEmployeeMutation.mutate({
                name: empName, email: empEmail, password: empPassword,
                role: empRole, permissions: empPermissions,
              })}
              disabled={!empName || !empEmail || !empPassword || createEmployeeMutation.isPending}
              className="gap-2"
            >
              {createEmployeeMutation.isPending
                ? <RefreshCw className="h-4 w-4 animate-spin" />
                : <UserPlus className="h-4 w-4" />}
              إضافة الموظف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Member Permissions Dialog ──────────────────────────────── */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              تعديل صلاحيات: {editMember?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الدور الوظيفي</Label>
              <Select value={editRole} onValueChange={(v) => {
                setEditRole(v as any);
                setEditPermissions(DEFAULT_PERMISSIONS[v] ?? DEFAULT_PERMISSIONS.staff);
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير فرع</SelectItem>
                  <SelectItem value="staff">موظف</SelectItem>
                  <SelectItem value="accountant">محاسب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Shield className="h-4 w-4 text-blue-500" /> الصلاحيات
              </Label>
              <div className="bg-gray-50 rounded-lg p-3 max-h-52 overflow-y-auto space-y-2 border border-gray-100">
                {Object.entries(PERMISSIONS_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}</span>
                    <Switch
                      checked={editPermissions[key] ?? false}
                      onCheckedChange={(v) => setEditPermissions(prev => ({ ...prev, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditMember(null)}>إلغاء</Button>
            <Button
              onClick={() => updateMemberMutation.mutate({ memberId: editMember.id, role: editRole, permissions: editPermissions })}
              disabled={updateMemberMutation.isPending}
              className="gap-2"
            >
              {updateMemberMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ────────────────────────────────────────── */}
      <Dialog open={!!resetMember} onOpenChange={(open) => !open && setResetMember(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              تغيير كلمة مرور: {resetMember?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">أدخل كلمة المرور الجديدة للموظف. سيتمكن من تسجيل الدخول بها فوراً.</p>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="pl-10"
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setResetMember(null)}>إلغاء</Button>
            <Button
              onClick={() => resetPasswordMutation.mutate({ userId: resetMember.userId, newPassword })}
              disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
              className="gap-2 bg-amber-600 hover:bg-amber-500"
            >
              {resetPasswordMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              تغيير كلمة المرور
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
