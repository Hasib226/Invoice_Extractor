"use client";

import { useState, useCallback } from "react";

const FIELDS = [
  "vendor_name",
  "invoice_number",
  "invoice_date",
  "due_date",
  "currency",
  "subtotal",
  "tax",
  "total",
];

export default function Home() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback((newFiles) => {
    const valid = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    const filtered = Array.from(newFiles).filter((f) => valid.includes(f.type));
    setFiles((prev) => [...prev, ...filtered]);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const processAll = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResults([]);
    setProgress({ current: 0, total: files.length });

    const newResults = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i, total: files.length });

      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/extract", { method: "POST", body: fd });
        const data = await res.json();

        if (res.ok && data.invoice) {
          newResults.push({ filename: file.name, status: "ok", data: data.invoice });
        } else {
          newResults.push({ filename: file.name, status: "error", error: data.error });
        }
      } catch (err) {
        newResults.push({ filename: file.name, status: "error", error: err.message });
      }
      setResults([...newResults]);
    }

    setProgress({ current: files.length, total: files.length });
    setProcessing(false);
  };

  const downloadCSV = () => {
    const ok = results.filter((r) => r.status === "ok");
    if (ok.length === 0) return;

    const headers = ["filename", ...FIELDS, "line_items_json"];
    const rows = ok.map((r) => [
      r.filename,
      ...FIELDS.map((f) => r.data[f] ?? ""),
      JSON.stringify(r.data.line_items ?? []),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter((r) => r.status === "ok").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Invoice Extractor</h1>
        <p className="text-gray-600 mb-8">
          Drop one or many invoices — get structured data and a CSV.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragActive ? "border-black bg-gray-100" : "border-gray-300 bg-white"
          }`}
        >
          <p className="text-gray-600 mb-4">
            Drag PDF or image invoices here, or click to select
          </p>
          <input
            id="file-input"
            type="file"
            accept=".pdf,image/*"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          <label
            htmlFor="file-input"
            className="inline-block bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded cursor-pointer"
          >
            Select Files
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-6 bg-white border rounded p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">{files.length} file(s) ready</h2>
              <button
                onClick={() => setFiles([])}
                disabled={processing}
                className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
              >
                Clear all
              </button>
            </div>
            <ul className="space-y-1 text-sm">
              {files.map((f, i) => (
                <li key={i} className="flex justify-between items-center py-1">
                  <span className="truncate">{f.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    disabled={processing}
                    className="text-gray-400 hover:text-red-600 ml-2 disabled:opacity-50"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={processAll}
              disabled={processing}
              className="mt-4 bg-black text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {processing
                ? `Extracting ${progress.current + 1}/${progress.total}…`
                : `Extract ${files.length} invoice(s)`}
            </button>
          </div>
        )}

        {processing && (
          <div className="mt-4 bg-white border rounded p-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-black h-2 rounded-full transition-all"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">Results</h2>
                <p className="text-sm text-gray-600">
                  {successCount} succeeded
                  {errorCount > 0 && `, ${errorCount} failed`}
                </p>
              </div>
              <button
                onClick={downloadCSV}
                disabled={successCount === 0}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Download CSV
              </button>
            </div>

            <div className="bg-white border rounded overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="text-left p-3">File</th>
                    <th className="text-left p-3">Vendor</th>
                    <th className="text-left p-3">Invoice #</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3 truncate max-w-xs">{r.filename}</td>
                      {r.status === "ok" ? (
                        <>
                          <td className="p-3">{r.data.vendor_name || "—"}</td>
                          <td className="p-3">{r.data.invoice_number || "—"}</td>
                          <td className="p-3">{r.data.invoice_date || "—"}</td>
                          <td className="p-3 text-right">
                            {r.data.currency} {r.data.total ?? "—"}
                          </td>
                          <td className="p-3 text-green-600">✓ OK</td>
                        </>
                      ) : (
                        <>
                          <td colSpan="4" className="p-3 text-red-600 text-xs">
                            {r.error}
                          </td>
                          <td className="p-3 text-red-600">✕ Error</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {successCount > 0 && (
              <details className="mt-4 bg-white border rounded p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  View raw JSON (first successful invoice)
                </summary>
                <pre className="mt-3 text-xs overflow-auto">
                  {JSON.stringify(
                    results.find((r) => r.status === "ok")?.data,
                    null,
                    2
                  )}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </main>
  );
}