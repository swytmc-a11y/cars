# نظام إدارة تأجير السيارات - قائمة المهام

## المرحلة الأولى: الإعداد والنشر
- [x] إنشاء مشروع webdev دائم على Manus
- [x] نسخ جميع ملفات المشروع من المستودع المحلي
- [x] إعداد قاعدة بيانات TiDB Cloud
- [x] إصلاح اتصال Drizzle ORM مع mysql2 pool
- [x] إنشاء 18 جدول في قاعدة البيانات
- [x] تشغيل الموقع وإصلاح جميع أخطاء الاتصال

## المرحلة الثانية: نظام Multi-Tenant
- [x] تحديث Schema قاعدة البيانات (جداول offices, office_members, invitations)
- [x] إضافة حقول userType, officeId, isActive, emailVerified لجدول users
- [x] إضافة officeId لجميع الجداول الرئيسية (vehicles, customers, contracts, reservations, maintenance, transfers, payments)
- [x] إنشاء ملف db-office.ts لوظائف Multi-Tenant
- [x] تحديث localAuth.register لدعم نوعين (owner/employee)
- [x] إنشاء مكتب تلقائياً عند تسجيل مالك جديد
- [x] منع الموظف من الدخول حتى يقبل الدعوة (isActive = false)
- [x] تطبيق عزل البيانات في جميع API endpoints
- [x] إضافة router الدعوات (invitations.send, invitations.accept, invitations.list, invitations.cancel)
- [x] إضافة router المكتب (office.info, office.members, office.updateMember, office.removeMember)
- [x] إنشاء صفحة قبول الدعوة (AcceptInvitePage)
- [x] إنشاء صفحة إدارة الموظفين (StaffManagementPage)
- [x] تحديث صفحة التسجيل لدعم اختيار نوع المستخدم
- [x] إضافة رابط إدارة الموظفين في القائمة الجانبية
- [x] TypeScript: 0 أخطاء
- [x] Build: نجح بدون أخطاء

## المهام المستقبلية
- [ ] تفعيل OTP لتأكيد البريد الإلكتروني عند التسجيل
- [ ] إضافة نظام الباقات والاشتراكات
- [ ] تحويل التطبيق إلى PWA لسطح المكتب
- [ ] إضافة إشعارات البريد الإلكتروني (RESEND_API_KEY)

## المرحلة الثالثة: إصلاح الأخطاء وتنظيف قاعدة البيانات
- [x] إصلاح adminProcedure ليقبل role='owner' بجانب role='admin' (خطأ 10002)
- [x] إصلاح getAllBranches لتفلتر بـ officeId (عزل البيانات)
- [x] إصلاح getAllUsers لتفلتر بـ officeId (عزل البيانات)
- [x] إصلاح getDashboardStats لتمرير officeId في جميع الاستعلامات
- [x] إصلاح globalSearch لتفلتر بـ officeId
- [x] إصلاح getAuditLogs لتفلتر بـ officeId
- [x] إصلاح getMonthlyRevenue لتفلتر بـ officeId
- [x] إصلاح getAllPayments لتفلتر بـ officeId
- [x] تحديث جميع endpoints في routers.ts لتمرير officeId من ctx.user
- [x] حذف 231 مستخدم وهمي (بدون email، غير نشط)
- [x] حذف المكتب الوهمي رقم 1 (مكتب الأمل) وجميع بياناته
- [x] حذف refresh_tokens منتهية الصلاحية أو لمستخدمين محذوفين
- [x] TypeScript: 0 أخطاء
- [x] Tests: 27 passed
- [x] Build: نجح بدون أخطاء

## المرحلة الرابعة: تفعيل البريد الإلكتروني
- [x] إضافة RESEND_API_KEY (3000 بريد مجاني شهرياً)
- [x] إنشاء دالة sendInvitationEmail منفصلة بقالب HTML احترافي
- [x] إصلاح invitations.send لاستخدام sendInvitationEmail بدلاً من sendOtpEmail
- [x] sendOtpEmail تعمل لإرسال كود نسيت كلمة المرور
- [x] TypeScript: 0 أخطاء | Tests: 27 passed

## المرحلة الخامسة: تبسيط نظام التسجيل والموظفين
- [ ] تحديث RegisterPage: إزالة خيار "موظف" وإبقاء التسجيل لملاك المكاتب فقط
- [ ] إضافة endpoint localAuth.createEmployee: ينشئ موظفاً مباشرة بإيميل+كلمة مرور (للمالك فقط)
- [ ] تحديث StaffManagementPage: إضافة نموذج "إضافة موظف" بإيميل+كلمة مرور+دور
- [ ] إخفاء رابط "إدارة الموظفين" من القائمة الجانبية لغير المالك
- [ ] إزالة نظام الدعوات من واجهة المستخدم (الاحتفاظ بالكود في الخلفية)

## المرحلة الخامسة: تبسيط نظام التسجيل والموظفين
- [x] صفحة التسجيل حصراً لملاك المكاتب (إزالة خيار الموظف)
- [x] إضافة endpoint createEmployee بإيميل وكلمة مرور مباشرة
- [x] إضافة endpoint updateEmployeePassword لتغيير كلمة مرور الموظف
- [x] تحديث StaffManagementPage: إضافة موظف بإيميل+كلمة مرور + تغيير كلمة المرور
- [x] إخفاء "إدارة الموظفين" و"سجل التدقيق" من القائمة لغير المالك
