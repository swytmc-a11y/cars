import fs from "node:fs";
import puppeteer, { type Browser } from "puppeteer-core";
import type { Contract, Customer, Vehicle, Payment } from "../drizzle/schema";

const methodLabels: Record<string, string> = {
  cash: "نقدي",
  card: "بطاقة",
  bank_transfer: "تحويل بنكي",
  stc_pay: "STC Pay",
};

function resolveChromiumPath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;

  const candidates = [
    ...(fs.existsSync("/opt/pw-browsers")
      ? fs
          .readdirSync("/opt/pw-browsers")
          .filter(name => name.startsWith("chromium-"))
          .map(name => `/opt/pw-browsers/${name}/chrome-linux/chrome`)
      : []),
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];

  const found = candidates.find(p => fs.existsSync(p));
  if (!found) {
    throw new Error(
      "No Chromium executable found for PDF generation. Set PUPPETEER_EXECUTABLE_PATH or install chromium.",
    );
  }
  return found;
}

async function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  const browser = await puppeteer.launch({
    executablePath: resolveChromiumPath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  return withBrowser(async browser => {
    const page = await browser.newPage();
    // domcontentloaded (not "load"): the template's Google Fonts @import may be
    // unreachable depending on network policy — don't block PDF generation on it.
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({ format: "a4", printBackground: true, margin: { top: "20px", bottom: "20px" } });
    return Buffer.from(pdf);
  });
}

const baseStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif; direction: rtl; padding: 40px; color: #1a1a1a; }
`;

export function buildContractHtml(contract: Contract, customer: Customer | undefined, vehicle: Vehicle | undefined): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>عقد تأجير - ${contract.contractNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
    ${baseStyles}
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
    .header h1 { font-size: 24px; color: #2563eb; margin-bottom: 5px; }
    .header p { color: #666; font-size: 14px; }
    .contract-number { background: #f0f4ff; padding: 10px 20px; border-radius: 8px; display: inline-block; margin: 10px 0; font-weight: 700; font-size: 18px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: 700; color: #2563eb; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { padding: 8px 12px; background: #f9fafb; border-radius: 6px; }
    .field-label { font-size: 12px; color: #6b7280; margin-bottom: 2px; }
    .field-value { font-size: 14px; font-weight: 600; }
    .total-section { background: #f0f4ff; padding: 20px; border-radius: 12px; margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .total-row.final { font-size: 18px; font-weight: 700; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 12px; margin-top: 8px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
    .signature-box { text-align: center; padding-top: 40px; border-top: 1px solid #333; }
    .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>عقد تأجير سيارة</h1>
    <p>نظام إدارة التأجير</p>
    <div class="contract-number">${contract.contractNumber}</div>
  </div>

  <div class="section">
    <div class="section-title">بيانات العميل</div>
    <div class="grid">
      <div class="field"><div class="field-label">الاسم</div><div class="field-value">${customer?.name || "-"}</div></div>
      <div class="field"><div class="field-label">رقم الهوية</div><div class="field-value">${customer?.idNumber || "-"}</div></div>
      <div class="field"><div class="field-label">الهاتف</div><div class="field-value">${customer?.phone || "-"}</div></div>
      <div class="field"><div class="field-label">رقم الرخصة</div><div class="field-value">${customer?.licenseNumber || "-"}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">بيانات السيارة</div>
    <div class="grid">
      <div class="field"><div class="field-label">السيارة</div><div class="field-value">${vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : "-"}</div></div>
      <div class="field"><div class="field-label">رقم اللوحة</div><div class="field-value">${vehicle?.plateNumber || "-"}</div></div>
      <div class="field"><div class="field-label">اللون</div><div class="field-value">${vehicle?.color || "-"}</div></div>
      <div class="field"><div class="field-label">العداد</div><div class="field-value">${contract.startMileage?.toLocaleString("ar-SA") ?? "-"} كم</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">تفاصيل العقد</div>
    <div class="grid">
      <div class="field"><div class="field-label">تاريخ البداية</div><div class="field-value">${new Date(contract.startDate).toLocaleDateString("ar-SA")}</div></div>
      <div class="field"><div class="field-label">تاريخ النهاية</div><div class="field-value">${new Date(contract.endDate).toLocaleDateString("ar-SA")}</div></div>
      <div class="field"><div class="field-label">عدد الأيام</div><div class="field-value">${contract.totalDays} يوم</div></div>
      <div class="field"><div class="field-label">السعر اليومي</div><div class="field-value">${Number(contract.dailyRate).toLocaleString("ar-SA")} ر.س</div></div>
    </div>
  </div>

  <div class="total-section">
    <div class="total-row"><span>السعر الأساسي</span><span>${Number(contract.basePrice).toLocaleString("ar-SA")} ر.س</span></div>
    ${Number(contract.discount) > 0 ? `<div class="total-row"><span>الخصم</span><span style="color:green">-${Number(contract.discount).toLocaleString("ar-SA")} ر.س</span></div>` : ""}
    ${Number(contract.additionalCharges) > 0 ? `<div class="total-row"><span>رسوم إضافية</span><span style="color:red">+${Number(contract.additionalCharges).toLocaleString("ar-SA")} ر.س</span></div>` : ""}
    <div class="total-row final"><span>الإجمالي المستحق</span><span>${Number(contract.finalPrice || contract.basePrice).toLocaleString("ar-SA")} ر.س</span></div>
  </div>

  <div class="signatures">
    <div class="signature-box">توقيع المؤجر</div>
    <div class="signature-box">توقيع المستأجر</div>
  </div>

  <div class="footer">
    <p>تم إنشاء هذا العقد بتاريخ ${new Date(contract.createdAt).toLocaleDateString("ar-SA")}</p>
  </div>
</body>
</html>`;
}

export interface ReportTable {
  title?: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface ReportOptions {
  title: string;
  subtitle?: string;
  officeName?: string;
  summary?: { label: string; value: string }[];
  tables: ReportTable[];
}

export function buildReportHtml(opts: ReportOptions): string {
  const summaryHtml = opts.summary?.length
    ? `<div class="summary">${opts.summary
        .map(s => `<div class="summary-item"><div class="summary-label">${s.label}</div><div class="summary-value">${s.value}</div></div>`)
        .join("")}</div>`
    : "";

  const tablesHtml = opts.tables
    .map(
      table => `
  ${table.title ? `<div class="section-title">${table.title}</div>` : ""}
  <table>
    <thead><tr>${table.headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>
      ${table.rows.length === 0
        ? `<tr><td colspan="${table.headers.length}" class="empty">لا توجد بيانات</td></tr>`
        : table.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
    </tbody>
  </table>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${opts.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
    ${baseStyles}
    .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #2563eb; padding-bottom: 15px; }
    .header h1 { font-size: 22px; color: #2563eb; margin-bottom: 4px; }
    .header p { color: #666; font-size: 13px; }
    .meta { text-align: center; color: #999; font-size: 11px; margin-bottom: 20px; }
    .summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 25px; }
    .summary-item { flex: 1; min-width: 120px; background: #f0f4ff; border-radius: 10px; padding: 12px; text-align: center; }
    .summary-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
    .summary-value { font-size: 16px; font-weight: 700; color: #2563eb; }
    .section-title { font-size: 15px; font-weight: 700; color: #2563eb; margin: 20px 0 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #2563eb; color: white; padding: 8px 10px; text-align: right; font-weight: 600; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
    .empty { text-align: center; color: #999; padding: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${opts.title}</h1>
    ${opts.subtitle ? `<p>${opts.subtitle}</p>` : ""}
    ${opts.officeName ? `<p>${opts.officeName}</p>` : ""}
  </div>
  <div class="meta">تاريخ الإصدار: ${new Date().toLocaleDateString("ar-SA")} - ${new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</div>
  ${summaryHtml}
  ${tablesHtml}
  <div class="footer">تم إنشاء هذا التقرير آلياً من نظام إدارة التأجير</div>
</body>
</html>`;
}

export function buildReceiptHtml(payment: Payment, contract: Contract | undefined, customer: Customer | undefined): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>إيصال دفع</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
    ${baseStyles}
    body { max-width: 400px; margin: 0 auto; }
    .receipt { border: 2px solid #e5e7eb; border-radius: 12px; padding: 30px; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h2 { color: #2563eb; font-size: 20px; }
    .header p { color: #666; font-size: 12px; margin-top: 4px; }
    .divider { border-top: 1px dashed #ccc; margin: 15px 0; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .row.total { font-weight: 700; font-size: 18px; color: #2563eb; margin-top: 10px; }
    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 11px; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h2>إيصال دفع</h2>
      <p>نظام إدارة التأجير</p>
    </div>
    <div class="divider"></div>
    <div class="row"><span>رقم العقد</span><span>${contract?.contractNumber || "-"}</span></div>
    <div class="row"><span>العميل</span><span>${customer?.name || "-"}</span></div>
    <div class="row"><span>التاريخ</span><span>${new Date(payment.paidAt).toLocaleDateString("ar-SA")}</span></div>
    <div class="row"><span>طريقة الدفع</span><span>${methodLabels[payment.method] || payment.method}</span></div>
    <div class="divider"></div>
    <div class="row total"><span>المبلغ المدفوع</span><span>${Number(payment.amount).toLocaleString("ar-SA")} ر.س</span></div>
    <div class="divider"></div>
    <div class="footer">
      <p>شكراً لتعاملكم معنا</p>
      <p>رقم الإيصال: PAY-${payment.id}</p>
    </div>
  </div>
</body>
</html>`;
}
