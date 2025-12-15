import React, { useState, ChangeEvent } from "react";
import { useTheme } from "../../themes";
import useTransactionsStore from "../../stores/transactions";

function SettingsRoute() {
  const { theme, setTheme } = useTheme();
  const importJSON = useTransactionsStore((s) => s.importJSON);
  const exportJSON = useTransactionsStore((s) => s.exportJSON);
  const exportCSV = useTransactionsStore((s) => s.exportCSV);
  const clearAll = useTransactionsStore((s) => s.clearAll);

  const [pasteValue, setPasteValue] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const themes: { key: string; label: string; description?: string }[] = [
    {
      key: "aix",
      label: "AIX",
      description: "Classic Motif-like look",
    },
    { key: "beos", label: "BeOS", description: "Playful BeOS styling" },
    {
      key: "cde",
      label: "CDE",
      description: "Older CDE color palette and widgets",
    },
    {
      key: "kde",
      label: "KDE",
      description: "Modern, glossy KDE-inspired theme",
    },
  ];

  function handleThemeChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value as any;
    setTheme(next);
    setImportResult(null);
  }

  function handleFileImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    setIsImporting(true);

    // FileReader is callback-based, so we wrap the async call inside
    reader.onload = async () => {
      try {
        const text = String(reader.result ?? "");
        // Await the async import from the store
        const res = await importJSON(text);
        setImportResult(`Imported ${res.added} item(s).`);
      } catch (err) {
        setImportResult(
          "Failed to import file. Ensure it's a JSON array of transactions.",
        );
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
      setImportResult("Failed to read file.");
      setIsImporting(false);
    };
    reader.readAsText(file);
    e.currentTarget.value = "";
  }

  async function handlePasteImport() {
    setIsImporting(true);
    try {
      // Await the async import
      const res = await importJSON(pasteValue);
      setImportResult(`Imported ${res.added} item(s) from pasted JSON.`);
    } catch {
      setImportResult(
        "Failed to import pasted content. Make sure it's valid JSON.",
      );
    } finally {
      setIsImporting(false);
      setPasteValue("");
    }
  }

  function handleExportJSON() {
    const content = exportJSON();
    download(
      `book-keeper-backup-${new Date().toISOString().slice(0, 10)}.json`,
      content,
      "application/json",
    );
  }

  function handleExportCSV() {
    const content = exportCSV();
    download(
      `book-keeper-backup-${new Date().toISOString().slice(0, 10)}.csv`,
      content,
      "text/csv",
    );
  }

  async function handleClearAll() {
    if (!confirm("Clear all transactions? This cannot be undone.")) return;
    await clearAll();
    setImportResult("All transactions cleared.");
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm opacity-70">
          Theme preferences and data import/export
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
          <h3 className="font-bold">Theme</h3>
          <p className="text-sm opacity-70">
            Choose a visual theme for the app. The selection is persisted to
            localStorage.
          </p>

          <div className="grid grid-cols-1 gap-2 mt-2">
            {themes.map((t) => (
              <label
                key={t.key}
                className="flex items-center gap-3 px-3 py-2 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <input
                  type="radio"
                  name="theme"
                  value={t.key}
                  checked={theme === t.key}
                  onChange={handleThemeChange}
                />
                <div>
                  <div className="font-medium">{t.label}</div>
                  {t.description && (
                    <div className="text-xs opacity-60">{t.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
          <h3 className="font-bold">Data Import / Export</h3>
          <p className="text-sm opacity-70">
            Import transactions from a JSON file or paste a JSON array. You can
            also export a backup (JSON / CSV).
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="px-3 py-2 rounded bg-slate-700 cursor-pointer hover:bg-slate-600 border border-slate-600">
                Choose file
                <input
                  type="file"
                  accept=".json,.txt"
                  onChange={handleFileImport}
                  className="sr-only"
                />
              </label>
              <button
                onClick={handleExportJSON}
                className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600"
              >
                Export JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600"
              >
                Export CSV
              </button>
            </div>

            <div>
              <div className="text-xs opacity-60 mb-1">Paste JSON</div>
              <textarea
                value={pasteValue}
                onChange={(e) => setPasteValue(e.target.value)}
                placeholder='Paste a JSON array here like: [{"amount":12,"type":"debit","description":"…"}]'
                className="w-full h-28 p-2 rounded bg-slate-900 border border-slate-700 text-sm"
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handlePasteImport}
                  disabled={isImporting || pasteValue.trim() === ""}
                  className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {isImporting ? "Importing..." : "Import Pasted JSON"}
                </button>
                <button
                  onClick={() => setPasteValue("")}
                  className="px-3 py-2 rounded bg-slate-700 border border-slate-600"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700 mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-60">Danger zone</div>
                <button
                  onClick={handleClearAll}
                  className="px-3 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white"
                >
                  Clear All Transactions
                </button>
              </div>
            </div>

            {importResult && (
              <div className="text-sm p-2 rounded bg-slate-900 border border-slate-700 mt-2">
                {importResult}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function download(
  filename: string,
  content: string,
  mime = "application/octet-stream",
) {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch {
    // no-op
  }
}

export default SettingsRoute;
