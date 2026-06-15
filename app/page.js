"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Extraction failed");
      else setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Invoice Extractor</h1>
        <p className="text-gray-600 mb-8">
          Drop a PDF or image invoice — get structured JSON in seconds.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm border rounded p-2 bg-white"
          />
          <button
            type="submit"
            disabled={!file || loading}
            className="bg-black text-white px-6 py-2 rounded disabled:opacity-50"
          >
            {loading ? "Extracting…" : "Extract"}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded text-red-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="mt-6">
            <h2 className="font-semibold mb-2">Result</h2>
            <pre className="bg-white border rounded p-4 text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}