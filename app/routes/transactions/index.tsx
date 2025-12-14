import React, { useMemo, useState, ChangeEvent } from "react";

import useTransactionsStore, {
  Transaction,
  TransactionType,
  formatCurrency,
} from "../../stores/transactions";

export default TransactionsRoute;

/* ----------------------------- Helpers ---------------------------------- */

function download(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* --------------------------- UI Components ------------------------------ */

function FilterBar() {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex items-center gap-3">
        <button className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 min-w-[100px] justify-between">
          Data View <span className="text-[9px]">▼</span>
        </button>
        <button className="px-4 py-1.5 text-xs font-bold">Filter</button>
        <button className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 min-w-[80px] justify-between">
          Date <span className="text-[9px]">▼</span>
        </button>
        <button className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 min-w-[100px] justify-between">
          Keywords <span className="text-[9px]">▼</span>
        </button>
        <button className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 min-w-[90px] justify-between">
          Amount <span className="text-[9px]">▼</span>
        </button>
      </div>
      <div className="flex-1"></div>
      <div>
        <button className="px-6 py-1.5 text-xs font-bold">Search</button>
      </div>
    </div>
  );
}

function GraphSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 shrink-0">
      {/* Net Change Panel */}
      <div className="lg:col-span-2 p-4 border rounded-sm bg-slate-800 border-slate-700 flex flex-col gap-4 panel-container">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs opacity-70 mb-1">
              Net change this period
            </div>
            <div className="text-3xl font-bold font-serif">$230.00</div>
          </div>
          <div className="flex">
            <button className="px-3 py-1 text-xs border border-r-0 first:rounded-l last:rounded-r last:border-r bg-slate-700 hover:bg-slate-600">
              Daily
            </button>
            <button className="px-3 py-1 text-xs border border-r-0 bg-slate-700 hover:bg-slate-600">
              Weekly
            </button>
            <button className="px-3 py-1 text-xs border last:rounded-r bg-slate-700 hover:bg-slate-600">
              Monthly
            </button>
          </div>
        </div>

        <div className="flex-1 relative min-h-[200px] chart-frame bg-black/20 p-2">
          {/* SVG Chart */}
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 600 200"
            preserveAspectRatio="none"
          >
            {/* Grid */}
            <line
              x1="0"
              y1="50"
              x2="600"
              y2="50"
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeDasharray="4 4"
              className="grid-line"
            />
            <line
              x1="0"
              y1="100"
              x2="600"
              y2="100"
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeDasharray="4 4"
              className="grid-line"
            />
            <line
              x1="0"
              y1="150"
              x2="600"
              y2="150"
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeDasharray="4 4"
              className="grid-line"
            />

            {/* Lines */}
            <polyline
              points="0,120 100,120 200,120 300,80 400,100 500,140 600,140"
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              className="chart-line-1"
            />
            <polyline
              points="0,80 100,80 200,80 260,90 360,110 440,120 600,100"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="3"
              className="chart-line-2"
            />

            {/* Tooltip (Mock) */}
            <g transform="translate(280, 20)">
              <rect
                x="0"
                y="0"
                width="80"
                height="42"
                fill="#fef08a"
                stroke="black"
                className="tooltip-bg"
              />
              <text
                x="40"
                y="14"
                textAnchor="middle"
                fontSize="10"
                fill="black"
                fontWeight="bold"
                className="tooltip-text"
              >
                NOV 6
              </text>
              <text
                x="40"
                y="26"
                textAnchor="middle"
                fontSize="9"
                fill="black"
                className="tooltip-text"
              >
                IN: 10.8K
              </text>
              <text
                x="40"
                y="36"
                textAnchor="middle"
                fontSize="9"
                fill="black"
                className="tooltip-text"
              >
                OUT: 8.23K
              </text>
              {/* Connector line */}
              <line
                x1="40"
                y1="42"
                x2="20"
                y2="70"
                stroke="black"
                strokeWidth="1"
              />
            </g>
          </svg>
        </div>
        <div className="flex justify-between text-[10px] opacity-60 px-1 font-mono">
          <span>NOV 1</span>
          <span>NOV 2</span>
          <span>NOV 3</span>
          <span>NOV 4</span>
          <span>NOV 5</span>
          <span>NOV 6</span>
        </div>
      </div>

      {/* Top Categories Panel */}
      <div className="p-4 border rounded-sm bg-slate-800 border-slate-700 flex flex-col gap-4 panel-container">
        <h3 className="font-bold text-sm">
          Top Categories
          <br />
          <span className="text-xs font-normal opacity-70">5 Categories</span>
        </h3>

        {/* Stacked Bar */}
        <div className="flex h-6 w-full border border-slate-600 rounded-sm overflow-hidden cat-bar-container">
          <div className="w-[30%] bg-cyan-400 cat-fill-1"></div>
          <div className="w-[20%] bg-blue-500 cat-fill-2"></div>
          <div className="w-[20%] bg-yellow-400 cat-fill-3"></div>
          <div className="w-[15%] bg-purple-500 cat-fill-4"></div>
          <div className="w-[15%] bg-green-500 cat-fill-5"></div>
        </div>

        {/* Legend */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-400 border border-black/20 cat-fill-1"></div>{" "}
            Google Workspace
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 border border-black/20 cat-fill-2"></div>{" "}
            Mobbin
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-400 border border-black/20 cat-fill-3"></div>{" "}
            Wise Use INC
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 border border-black/20 cat-fill-4"></div>{" "}
            Internal Transfer
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 border border-black/20 cat-fill-5"></div>{" "}
            AWS
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Main Component ----------------------------- */

function TransactionsRoute() {
  // core data from the global store
  const transactions = useTransactionsStore((s) => s.transactions);
  const selectedIds = useTransactionsStore((s) => s.selectedIds);
  const addTransaction = useTransactionsStore((s) => s.addTransaction);
  const deleteTransaction = useTransactionsStore((s) => s.deleteTransaction);
  const bulkDelete = useTransactionsStore((s) => s.bulkDelete);
  const toggleSelect = useTransactionsStore((s) => s.toggleSelect);
  const clearSelection = useTransactionsStore((s) => s.clearSelection);
  const exportJSON = useTransactionsStore((s) => s.exportJSON);
  const exportCSV = useTransactionsStore((s) => s.exportCSV);
  const importJSON = useTransactionsStore((s) => s.importJSON);
  const setFilters = useTransactionsStore((s) => s.setFilters);
  const filters = useTransactionsStore((s) => s.filters);

  // local UI state for form and search
  const [q, setQ] = useState(filters.q ?? "");
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    amount: "",
    type: "debit" as TransactionType,
    account: "Default",
    category: "",
  });

  // derived filtered list (client-side)
  const filtered = useMemo(() => {
    const qq = (q || "").trim().toLowerCase();
    return transactions.filter((t) => {
      if (filters.type && filters.type !== "all" && t.type !== filters.type)
        return false;
      if (filters.account && t.account !== filters.account) return false;
      if (filters.category && t.category !== filters.category) return false;
      if (filters.from && new Date(t.date) < new Date(filters.from))
        return false;
      if (filters.to && new Date(t.date) > new Date(filters.to)) return false;
      if (!qq) return true;
      const hay =
        `${t.description ?? ""} ${t.category ?? ""} ${t.account ?? ""} ${(
          t.tags || []
        ).join(" ")}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [transactions, filters, q]);

  /* -------------------------- Event Handlers ----------------------------- */

  function onChangeForm<T extends keyof typeof form>(
    key: T,
    value: (typeof form)[T],
  ) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function handleAdd(e?: React.FormEvent) {
    e?.preventDefault();
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || form.description.trim() === "") {
      // minimal validation
      return;
    }
    addTransaction({
      date: form.date,
      amount: Math.abs(amt),
      type: form.type,
      description: form.description,
      account: form.account,
      category: form.category || "Uncategorized",
    });
    // reset form
    setForm((s) => ({ ...s, description: "", amount: "" }));
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    deleteTransaction(id);
  }

  function handleBulkDeleteSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected transactions?`)) return;
    bulkDelete(selectedIds);
    clearSelection();
  }

  function handleExportJSON() {
    const json = exportJSON();
    download(
      `book-keeper-transactions-${new Date().toISOString().slice(0, 10)}.json`,
      json,
      "application/json",
    );
  }

  function handleExportCSV() {
    const csv = exportCSV();
    download(
      `book-keeper-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      "text/csv",
    );
  }

  function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        let added = 0;
        try {
          const res = importJSON(text);
          added = res.added || 0;
        } catch {
          // ignore errors
        }
        if (added === 0 && text.trim()) {
          alert(
            "Import completed (no items added). Make sure the file is valid JSON array.",
          );
        } else {
          alert(`Imported ${added} transactions.`);
        }
      } catch {
        alert("Failed to import file.");
      }
    };
    reader.readAsText(file);
    e.currentTarget.value = "";
  }

  function handleSearchChange(v: string) {
    setQ(v);
    setFilters({ ...(filters || {}), q: v });
  }

  function toggleRow(id: string) {
    toggleSelect(id);
  }

  /* ------------------------------ Render --------------------------------- */

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold">Transactions</h2>
          <p className="text-sm opacity-70">
            Local-first transaction list — persisted in browser storage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search description, category..."
            className="px-3 py-2 rounded bg-slate-800 border border-slate-700"
          />
          <button
            onClick={handleExportJSON}
            className="px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700"
          >
            Export JSON
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700"
          >
            Export CSV
          </button>
          <label className="px-3 py-2 rounded bg-slate-800 border border-slate-700 cursor-pointer hover:bg-slate-700">
            Import
            <input
              type="file"
              accept=".json,.txt"
              onChange={handleImportFile}
              className="sr-only"
            />
          </label>
        </div>
      </header>

      {/* Filter Toolbar matching screenshot */}
      <FilterBar />

      {/* Graph Section */}
      <GraphSection />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <form
          onSubmit={(e) => {
            handleAdd(e);
          }}
          className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-3 h-fit panel-container"
        >
          <h3 className="font-bold">Add Transaction</h3>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.date}
              onChange={(e) => onChangeForm("date", e.target.value)}
              className="px-2 py-2 rounded bg-slate-900 border border-slate-700 col-span-1"
            />
            <select
              value={form.type}
              onChange={(e) =>
                onChangeForm("type", e.target.value as TransactionType)
              }
              className="px-2 py-2 rounded bg-slate-900 border border-slate-700"
            >
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>

          <input
            value={form.description}
            onChange={(e) => onChangeForm("description", e.target.value)}
            placeholder="Description"
            className="w-full px-2 py-2 rounded bg-slate-900 border border-slate-700"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.amount}
              onChange={(e) => onChangeForm("amount", e.target.value)}
              placeholder="Amount (e.g. 12.34)"
              className="px-2 py-2 rounded bg-slate-900 border border-slate-700"
            />
            <input
              value={form.account}
              onChange={(e) => onChangeForm("account", e.target.value)}
              placeholder="Account"
              className="px-2 py-2 rounded bg-slate-900 border border-slate-700"
            />
          </div>

          <input
            value={form.category}
            onChange={(e) => onChangeForm("category", e.target.value)}
            placeholder="Category (optional)"
            className="w-full px-2 py-2 rounded bg-slate-900 border border-slate-700"
          />

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() =>
                setForm({
                  date: new Date().toISOString().slice(0, 10),
                  description: "",
                  amount: "",
                  type: "debit",
                  account: "Default",
                  category: "",
                })
              }
              className="px-3 py-2 rounded bg-slate-700"
            >
              Reset
            </button>
          </div>
        </form>

        <div className="lg:col-span-2 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="text-sm opacity-70">
              {filtered.length} transaction(s)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDeleteSelected}
                className="px-3 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold"
                disabled={selectedIds.length === 0}
              >
                Delete Selected ({selectedIds.length})
              </button>
              <button
                onClick={() => {
                  setFilters({ type: "all" });
                  setQ("");
                }}
                className="px-3 py-2 rounded bg-slate-800 border border-slate-700"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="overflow-auto bg-slate-800 border border-slate-700 rounded-lg flex-1 panel-container">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="text-sm font-bold">
                  <th className="px-3 py-2 w-12 border-b border-slate-600 bg-inherit">
                    <input
                      type="checkbox"
                      checked={selectedAll(selectedIds, filtered)}
                      onChange={(e) =>
                        toggleSelectAll(
                          e.target.checked,
                          filtered,
                          toggleSelect,
                          clearSelection,
                        )
                      }
                    />
                  </th>
                  <th className="px-3 py-2 border-b border-slate-600 bg-inherit">
                    Date
                  </th>
                  <th className="px-3 py-2 border-b border-slate-600 bg-inherit">
                    Description
                  </th>
                  <th className="px-3 py-2 border-b border-slate-600 bg-inherit">
                    Account
                  </th>
                  <th className="px-3 py-2 border-b border-slate-600 bg-inherit">
                    Category
                  </th>
                  <th className="px-3 py-2 text-right border-b border-slate-600 bg-inherit">
                    Amount
                  </th>
                  <th className="px-3 py-2 border-b border-slate-600 bg-inherit">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-700/50 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(t.id)}
                        onChange={() => toggleRow(t.id)}
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-sm">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium">{t.description}</div>
                      <div className="text-xs opacity-60">
                        {t.tags?.join(", ")}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-sm">{t.account}</td>
                    <td className="px-3 py-2 align-top text-sm">
                      {t.category}
                    </td>
                    <td
                      className={`px-3 py-2 align-top text-right font-mono ${t.type === "credit" ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {t.type === "credit" ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="px-2 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center opacity-60"
                    >
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------------- Small Utilities ------------------------------ */

function formatDate(d: string) {
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString();
  } catch {
    return d;
  }
}

function selectedAll(selectedIds: string[], list: Transaction[]) {
  if (list.length === 0) return false;
  return list.every((t) => selectedIds.includes(t.id));
}

function toggleSelectAll(
  checked: boolean,
  list: Transaction[],
  toggleSelectFn: (id: string) => void,
  clearSelectionFn: () => void,
) {
  if (!checked) {
    clearSelectionFn();
    return;
  }
  // select all visible rows
  list.forEach((t) => toggleSelectFn(t.id));
}
