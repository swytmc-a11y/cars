import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import UsersManagement from "./UsersManagement";
import InspectionTemplatesTab from "./InspectionTemplatesTab";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: branches, isLoading } = trpc.branches.list.useQuery();
  const utils = trpc.useUtils();

  const [branchOpen, setBranchOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: "", city: "", address: "", phone: "" });
  const [editingBranch, setEditingBranch] = useState<number | null>(null);

  const createBranch = trpc.branches.create.useMutation({
    onSuccess: () => { toast.success("تم إضافة الفرع"); utils.branches.list.invalidate(); setBranchOpen(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateBranch = trpc.branches.update.useMutation({
    onSuccess: () => { toast.success("تم تحديث الفرع"); utils.branches.list.invalidate(); setBranchOpen(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => { setBranchForm({ name: "", city: "", address: "", phone: "" }); setEditingBranch(null); };

  const handleBranchSubmit = () => {
    if (!branchForm.name) { toast.error("اسم الفرع مطلوب"); return; }
    if (editingBranch) {
      updateBranch.mutate({ id: editingBranch, ...branchForm });
    } else {
      createBranch.mutate(branchForm);
    }
  };

  const openEditBranch = (branch: any) => {
    setBranchForm({ name: branch.name, city: branch.city || "", address: branch.address || "", phone: branch.phone || "" });
    setEditingBranch(branch.id);
    setBranchOpen(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الإعدادات</h1>

      <Tabs defaultValue="branches">
        <TabsList>
          <TabsTrigger value="branches">الفروع</TabsTrigger>
          <TabsTrigger value="inspections">نماذج الفحص</TabsTrigger>
          <TabsTrigger value="users">المستخدمين</TabsTrigger>
          <TabsTrigger value="account">الحساب</TabsTrigger>
        </TabsList>

        <TabsContent value="branches" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">إدارة الفروع</h2>
            <Dialog open={branchOpen} onOpenChange={(open) => { setBranchOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 ml-2" />إضافة فرع</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingBranch ? "تعديل الفرع" : "إضافة فرع جديد"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>اسم الفرع *</Label><Input value={branchForm.name} onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>المدينة</Label><Input value={branchForm.city} onChange={e => setBranchForm(f => ({ ...f, city: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>العنوان</Label><Input value={branchForm.address} onChange={e => setBranchForm(f => ({ ...f, address: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>الهاتف</Label><Input value={branchForm.phone} onChange={e => setBranchForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <Button className="w-full" onClick={handleBranchSubmit} disabled={createBranch.isPending || updateBranch.isPending}>
                    {(createBranch.isPending || updateBranch.isPending) ? "جاري الحفظ..." : editingBranch ? "حفظ التعديلات" : "إضافة"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {branches?.map(branch => (
              <Card key={branch.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{branch.name}</div>
                    <div className="text-sm text-muted-foreground">{branch.city || '-'} | {branch.phone || '-'}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEditBranch(branch)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {branches?.length === 0 && <div className="text-center py-8 text-muted-foreground">لا توجد فروع</div>}
          </div>
        </TabsContent>

        <TabsContent value="inspections" className="mt-4">
          <InspectionTemplatesTab />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="account" className="mt-4">
          <Card>
            <CardHeader><CardTitle>معلومات الحساب</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">الاسم</Label><div className="font-medium mt-1">{user?.name || '-'}</div></div>
                <div><Label className="text-muted-foreground">البريد الإلكتروني</Label><div className="font-medium mt-1">{user?.email || '-'}</div></div>
                <div><Label className="text-muted-foreground">الدور</Label><div className="font-medium mt-1">{user?.role === 'admin' ? 'مدير عام' : user?.role === 'staff' ? 'موظف' : user?.role === 'accountant' ? 'محاسب' : 'مستخدم'}</div></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
