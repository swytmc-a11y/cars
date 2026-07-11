/**
 * email.ts — Email sending service using Resend SDK
 * Supports: OTP (password reset), Invitation links
 */
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const APP_NAME = process.env.VITE_APP_TITLE || "نظام تأجير السيارات";
const APP_URL = process.env.VITE_APP_URL || "https://carrental-ggalnbyd.manus.space";

// ─── OTP Email (Password Reset) ──────────────────────────────────────────────
export async function sendOtpEmail(to: string, otp: string, userName?: string): Promise<boolean> {
  try {
    if (!resend) {
      console.warn("[Email] Resend API key not configured. Skipping OTP email.");
      return true;
    }
    const greeting = userName ? `مرحباً ${userName}،` : "مرحباً،";
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Tahoma,sans-serif;direction:rtl;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${APP_NAME}</h1>
<p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">إعادة تعيين كلمة المرور</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">${greeting}</p>
<p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">تلقينا طلباً لإعادة تعيين كلمة المرور. استخدم الكود أدناه:</p>
<div style="background:#f0f9ff;border:2px solid #3b82f6;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
<p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:500;">كود التحقق</p>
<p style="margin:0;color:#1e40af;font-size:40px;font-weight:800;letter-spacing:12px;font-family:monospace;">${otp}</p>
</div>
<div style="background:#fef3c7;border-right:4px solid #f59e0b;border-radius:6px;padding:12px 16px;margin:0 0 24px;">
<p style="margin:0;color:#92400e;font-size:13px;">⚠️ هذا الكود صالح لمدة <strong>10 دقائق</strong> فقط. لا تشاركه مع أي شخص.</p>
</div>
<p style="margin:0;color:#6b7280;font-size:13px;">إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد.</p>
</td></tr>
<tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
<p style="margin:0;color:#9ca3af;font-size:12px;">${APP_NAME} — جميع الحقوق محفوظة</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject: `${otp} - كود إعادة تعيين كلمة المرور`,
      html,
    });
    if (error) { console.error("[Email] Resend OTP error:", error); return false; }
    console.log(`[Email] OTP sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send OTP email:", err);
    return false;
  }
}

// ─── Invitation Email ─────────────────────────────────────────────────────────
export async function sendInvitationEmail(opts: {
  to: string;
  officeName: string;
  inviterName: string;
  role: string;
  inviteToken: string;
}): Promise<boolean> {
  try {
    if (!resend) {
      console.warn("[Email] Resend API key not configured. Skipping invitation email.");
      return true;
    }
    const inviteUrl = `${APP_URL}/accept-invite?token=${opts.inviteToken}`;
    const roleLabel = opts.role === "admin" ? "مدير" : opts.role === "accountant" ? "محاسب" : "موظف";
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Tahoma,sans-serif;direction:rtl;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:36px 40px;text-align:center;">
<div style="font-size:40px;margin-bottom:12px;">🏢</div>
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${APP_NAME}</h1>
<p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">دعوة للانضمام إلى الفريق</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="margin:0 0 16px;color:#374151;font-size:16px;">مرحباً،</p>
<p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">
قام <strong style="color:#1e40af;">${opts.inviterName}</strong> بدعوتك للانضمام إلى 
<strong style="color:#1e40af;">${opts.officeName}</strong> بصفة <strong>${roleLabel}</strong>.
</p>
<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin:0 0 28px;text-align:center;">
<p style="margin:0;color:#1e40af;font-size:14px;font-weight:600;">الدور الوظيفي: ${roleLabel}</p>
<p style="margin:6px 0 0;color:#6b7280;font-size:13px;">مكتب: ${opts.officeName}</p>
</div>
<div style="text-align:center;margin:0 0 28px;">
<a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;">
✅ قبول الدعوة
</a>
</div>
<div style="background:#f9fafb;border-radius:8px;padding:14px 16px;margin:0 0 24px;">
<p style="margin:0 0 6px;color:#6b7280;font-size:12px;">أو انسخ هذا الرابط في متصفحك:</p>
<p style="margin:0;color:#3b82f6;font-size:12px;word-break:break-all;">${inviteUrl}</p>
</div>
<div style="background:#fef3c7;border-right:4px solid #f59e0b;border-radius:6px;padding:12px 16px;">
<p style="margin:0;color:#92400e;font-size:13px;">⏰ تنتهي صلاحية هذه الدعوة خلال <strong>48 ساعة</strong>. إذا لم تكن تتوقع هذه الدعوة يمكنك تجاهل هذا البريد.</p>
</div>
</td></tr>
<tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
<p style="margin:0;color:#9ca3af;font-size:12px;">${APP_NAME} — جميع الحقوق محفوظة</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: opts.to,
      subject: `دعوة للانضمام إلى ${opts.officeName} - ${APP_NAME}`,
      html,
    });
    if (error) { console.error("[Email] Resend invitation error:", error); return false; }
    console.log(`[Email] Invitation sent to ${opts.to}`);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send invitation email:", err);
    return false;
  }
}
