"use client";

export default function ExportExcelButton({
  data,
  filename,
  label = "Export Excel",
}: {
  data: Record<string, any>[];
  filename: string;
  label?: string;
}) {
  async function handleExport() {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
  }

  return (
    <button type="button" onClick={handleExport} className="btn-secondary text-xs whitespace-nowrap">
      ⬇ {label}
    </button>
  );
}
