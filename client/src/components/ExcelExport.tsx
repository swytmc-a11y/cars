/**
 * ExcelExport — utility component that exports data arrays to .xlsx files
 * Uses the `xlsx` (SheetJS) library bundled with the project.
 */
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExcelExportProps<T extends object> {
  data: T[];
  headers: { key: keyof T; label: string }[];
  filename?: string;
  sheetName?: string;
  disabled?: boolean;
  label?: string;
}

export function ExcelExport<T extends object>({
  data,
  headers,
  filename = "export",
  sheetName = "البيانات",
  disabled = false,
  label = "تصدير Excel",
}: ExcelExportProps<T>) {
  function handleExport() {
    if (!data.length) return;

    // Build rows using the provided header mapping
    const rows = data.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const h of headers) {
        mapped[h.label] = row[h.key] ?? "";
      }
      return mapped;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Set column widths based on header label length
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.label.length * 2, 15) }));

    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || !data.length}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
