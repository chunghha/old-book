import React, { useMemo, useState, useCallback } from "react";
import { useForm } from "@tanstack/react-form";
import { Pencil } from "lucide-react";
import {
  useTransactions,
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useBulkDeleteTransactions,
  useImportTransactions,
} from "../../lib/query";
import {
  Transaction,
  TransactionType,
  PaymentMethod,
  ReceiptStatus,
  TransactionStatus,
  DailyAggregate,
  CategoryBreakdown,
} from "../../db/types";

type TimeRange = "daily" | "weekly" | "monthly";

function formatCurrency(n: number, locale = "en-US", currency = "USD"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function formatShortDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatChartDate(dateStr: string, range: TimeRange): string {
  try {
    const date = new Date(dateStr);
    if (range === "monthly") {
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
import { EditTransactionModal } from "../../components/EditTransactionModal";
import {
  importFromFile,
  exportToFile,
  parseCSV,
  transactionsToCSV,
} from "../../lib/file-dialogs";
import { VirtualTable } from "../../components/VirtualList";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

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

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "wire", label: "Wire" },
  { value: "ach", label: "ACH" },
  { value: "transfer", label: "Transfer" },
  { value: "incoming", label: "Incoming" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
];

const RECEIPT_STATUS: { value: ReceiptStatus; label: string }[] = [
  { value: "attached", label: "Attached" },
  { value: "missing", label: "Missing" },
  { value: "n/a", label: "N/A" },
];

const STATUS_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: "done", label: "Done" },
  { value: "pending", label: "Pending" },
  { value: "review", label: "Review" },
];

/* --------------------------- Filter Bar ------------------------------ */

interface TransactionFilters {
  q?: string;
  account?: string;
  category?: string;
  from?: string;
  to?: string;
  type?: TransactionType | "all";
  status?: TransactionStatus | "all";
  method?: PaymentMethod | "all";
}

interface FilterBarProps {
  filters: TransactionFilters;
  setFilters: (f: TransactionFilters) => void;
  accounts: string[];
  categories: string[];
  onSearch: () => void;
}

function FilterBar({
  filters,
  setFilters,
  accounts,
  categories,
  onSearch,
}: FilterBarProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAmountFilter, setShowAmountFilter] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Data View */}
        <select
          value={filters.type || "all"}
          onChange={(e) =>
            setFilters({
              ...filters,
              type: e.target.value as TransactionType | "all",
            })
          }
          className="px-3 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-700 border border-slate-400 dark:border-slate-600 rounded-sm cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="credit">Credits</option>
          <option value="debit">Debits</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.status || "all"}
          onChange={(e) =>
            setFilters({
              ...filters,
              status: e.target.value as TransactionStatus | "all",
            })
          }
          className="px-3 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-700 border border-slate-400 dark:border-slate-600 rounded-sm cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="done">Done</option>
          <option value="pending">Pending</option>
          <option value="review">Review</option>
        </select>

        {/* Date Range */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 bg-slate-200 dark:bg-slate-700 border border-slate-400 dark:border-slate-600 rounded-sm"
          >
            Date <span className="text-[9px]">▼</span>
          </button>
          {showDatePicker && (
            <div className="absolute top-full left-0 mt-1 p-3 card border border-slate-600 rounded shadow-lg z-50 space-y-2">
              <div>
                <label className="text-xs opacity-70">From</label>
                <input
                  type="date"
                  value={filters.from || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, from: e.target.value })
                  }
                  className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded"
                />
              </div>
              <div>
                <label className="text-xs opacity-70">To</label>
                <input
                  type="date"
                  value={filters.to || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, to: e.target.value })
                  }
                  className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded"
                />
              </div>
              <button
                onClick={() => {
                  setFilters({ ...filters, from: undefined, to: undefined });
                  setShowDatePicker(false);
                }}
                className="text-xs text-cyan-400 hover:underline"
              >
                Clear dates
              </button>
            </div>
          )}
        </div>

        {/* Category Filter */}
        <select
          value={filters.category || ""}
          onChange={(e) =>
            setFilters({ ...filters, category: e.target.value || undefined })
          }
          className="px-3 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-700 border border-slate-400 dark:border-slate-600 rounded-sm cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Account Filter */}
        <select
          value={filters.account || ""}
          onChange={(e) =>
            setFilters({ ...filters, account: e.target.value || undefined })
          }
          className="px-3 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-700 border border-slate-400 dark:border-slate-600 rounded-sm cursor-pointer"
        >
          <option value="">All Accounts</option>
          {accounts.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search..."
          value={filters.q || ""}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          className="px-3 py-1.5 text-xs bg-slate-200 dark:bg-slate-700 border border-slate-400 dark:border-slate-600 rounded-sm w-40"
        />
      </div>

      <div className="flex-1" />

      <button
        onClick={onSearch}
        className="px-6 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-700 border border-slate-400 dark:border-slate-600 rounded-sm hover:brightness-110"
      >
        Search
      </button>
    </div>
  );
}

/* --------------------------- Chart Components ------------------------------ */

interface ChartProps {
  data: DailyAggregate[];
  timeRange: "daily" | "weekly" | "monthly";
}

function LineChart({ data, timeRange }: ChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { maxValue, points, inflowPoints, outflowPoints, validDataLength } =
    useMemo(() => {
      if (data.length === 0) {
        return {
          maxValue: 100,
          points: [],
          inflowPoints: "",
          outflowPoints: "",
          validDataLength: 0,
        };
      }

      // Filter out invalid data
      const validData = data.filter(
        (d) => !isNaN(d.inflow) && !isNaN(d.outflow),
      );
      if (validData.length === 0) {
        return {
          maxValue: 100,
          points: [],
          inflowPoints: "",
          outflowPoints: "",
          validDataLength: 0,
        };
      }

      // Find max value for scaling
      let max = 0;
      for (const d of validData) {
        max = Math.max(max, d.inflow, d.outflow);
      }
      if (max === 0) {
        return {
          maxValue: 100,
          points: [],
          inflowPoints: "",
          outflowPoints: "",
          validDataLength: 0,
        };
      }

      const width = 560;
      const height = 160;
      const padding = 20;
      const usableWidth = width - padding * 2;
      const usableHeight = height - padding * 2;

      const pts = validData.map((d, i) => {
        const x =
          padding + (i / Math.max(validData.length - 1, 1)) * usableWidth;
        const inflowY = padding + (1 - d.inflow / max) * usableHeight;
        const outflowY = padding + (1 - d.outflow / max) * usableHeight;
        return { x, inflowY, outflowY, data: d };
      });

      const inflowPts = pts.map((p) => `${p.x},${p.inflowY}`).join(" ");
      const outflowPts = pts.map((p) => `${p.x},${p.outflowY}`).join(" ");

      return {
        maxValue: max,
        points: pts,
        inflowPoints: inflowPts,
        outflowPoints: outflowPts,
        validDataLength: validData.length,
      };
    }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm opacity-60">
        No data to display. Add some transactions!
      </div>
    );
  }

  if (validDataLength === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm opacity-60">
        No chart data available. Add transactions to see trends.
      </div>
    );
  }

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 600 200"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1="20"
          y1={20 + ratio * 160}
          x2="580"
          y2={20 + ratio * 160}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeDasharray="4 4"
          className="grid-line"
        />
      ))}

      {/* Outflow line (red) */}
      {outflowPoints && (
        <polyline
          points={outflowPoints}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Inflow line (cyan) */}
      {inflowPoints && (
        <polyline
          points={inflowPoints}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Interactive points */}
      {points.map((p, i) => (
        <g key={i}>
          {/* Larger invisible hitbox */}
          <circle
            cx={p.x}
            cy={(p.inflowY + p.outflowY) / 2}
            r="15"
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ cursor: "pointer" }}
          />
          {/* Inflow dot */}
          <circle
            cx={p.x}
            cy={p.inflowY}
            r="4"
            fill="#22d3ee"
            stroke="#000"
            strokeWidth="1"
            pointerEvents="none"
          />
          {/* Outflow dot */}
          <circle
            cx={p.x}
            cy={p.outflowY}
            r="4"
            fill="#ef4444"
            stroke="#000"
            strokeWidth="1"
            pointerEvents="none"
          />
        </g>
      ))}

      {/* Tooltip */}
      {hovered && (
        <g
          transform={`translate(${Math.min(hovered.x - 40, 520)}, ${Math.max(hovered.inflowY - 60, 5)})`}
        >
          <rect
            x="0"
            y="0"
            width="90"
            height="50"
            fill="#fef9c3"
            stroke="#000"
            strokeWidth="1"
            rx="2"
            className="tooltip-bg"
          />
          <text
            x="45"
            y="14"
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#000"
            className="tooltip-text"
          >
            {formatChartDate(hovered.data.date, timeRange)}
          </text>
          <text
            x="45"
            y="28"
            textAnchor="middle"
            fontSize="9"
            fill="#0891b2"
            className="tooltip-text"
          >
            IN: {formatCurrency(hovered.data.inflow)}
          </text>
          <text
            x="45"
            y="42"
            textAnchor="middle"
            fontSize="9"
            fill="#dc2626"
            className="tooltip-text"
          >
            OUT: {formatCurrency(hovered.data.outflow)}
          </text>
        </g>
      )}

      {/* X-axis labels */}
      {points.length > 0 &&
        points
          .filter(
            (_, i) =>
              i === 0 ||
              i === points.length - 1 ||
              (points.length > 5 && i % Math.ceil(points.length / 5) === 0),
          )
          .map((p, i) => (
            <text
              key={i}
              x={p.x}
              y="195"
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              opacity="0.6"
              className="font-mono"
            >
              {formatChartDate(p.data.date, timeRange)}
            </text>
          ))}
    </svg>
  );
}

interface CategoryBarProps {
  breakdown: CategoryBreakdown[];
}

function CategoryBar({ breakdown }: CategoryBarProps) {
  // Only show expense categories (negative amounts)
  const expenseBreakdown = breakdown.filter((cat) => cat.amount < 0);
  const top5 = expenseBreakdown.slice(0, 5);

  if (top5.length === 0) {
    return (
      <div className="text-sm opacity-60 text-center py-4">
        No expense categories yet
      </div>
    );
  }

  const totalExpense = expenseBreakdown.reduce(
    (sum, cat) => sum + Math.abs(cat.amount),
    0,
  );

  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

  const processed = top5.map((cat, i) => ({
    ...cat,
    percentage:
      totalExpense > 0 ? (Math.abs(cat.amount) / totalExpense) * 100 : 0,
    color: colors[i % colors.length],
    total: cat.amount,
  }));

  return (
    <div className="space-y-3">
      {/* Stacked horizontal bar */}
      <div className="flex h-6 w-full border border-slate-600 rounded-sm overflow-hidden cat-bar-container">
        {processed.map((cat) => (
          <div
            key={cat.category}
            style={{
              width: `${cat.percentage}%`,
              backgroundColor: cat.color,
              minWidth: cat.percentage > 0 ? "4px" : "0",
            }}
            title={`${cat.category}: ${cat.percentage.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-1.5 text-xs">
        {processed.map((cat) => (
          <div key={cat.category} className="flex items-center gap-2">
            <div
              className="w-3 h-3 border border-black/20 shrink-0"
              style={{ backgroundColor: cat.color }}
            />
            <span className="truncate flex-1">{cat.category}</span>
            <span className="text-[10px] opacity-60 font-mono">
              {formatCurrency(Math.abs(cat.total))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface GraphSectionProps {
  netChange: number;
  chartData: DailyAggregate[];
  categoryBreakdown: CategoryBreakdown[];
  timeRange: "daily" | "weekly" | "monthly";
  setTimeRange: (range: "daily" | "weekly" | "monthly") => void;
}

function GraphSection({
  netChange,
  chartData,
  categoryBreakdown,
  timeRange,
  setTimeRange,
}: GraphSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 shrink-0">
      {/* Net Change & Chart Panel */}
      <div className="lg:col-span-2 p-4 border rounded-sm card panel-container border-slate-700 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs opacity-70 mb-1">
              Net change this period
            </div>
            <div
              className={`text-3xl font-bold font-serif ${netChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}
            >
              {netChange >= 0 ? "+" : ""}
              {formatCurrency(netChange)}
            </div>
          </div>
          <div className="flex">
            {(["daily", "weekly", "monthly"] as const).map((range, i, arr) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs border border-slate-600 capitalize transition-colors ${
                  i === 0
                    ? "rounded-l border-r-0"
                    : i === arr.length - 1
                      ? "rounded-r"
                      : "border-r-0"
                } ${timeRange === range ? "bg-blue-600 text-white font-semibold" : "bg-slate-700 hover:bg-slate-600"}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 relative min-h-45 chart-frame bg-black rounded p-2">
          <LineChart data={chartData} timeRange={timeRange} />
        </div>
      </div>

      {/* Top Categories Panel */}
      <div className="p-4 border rounded-sm card panel-container border-slate-700 flex flex-col gap-3">
        <h3 className="font-bold text-sm">
          Top Categories
          <br />
          <span className="text-xs font-normal opacity-70">
            {categoryBreakdown.length} Categories
          </span>
        </h3>
        <CategoryBar breakdown={categoryBreakdown} />
      </div>
    </div>
  );
}

/* --------------------------- Transaction Form ------------------------------ */

interface TransactionFormData {
  date: string;
  type: TransactionType;
  payee: string;
  description: string;
  amount: string;
  account: string;
  category: string;
  method: PaymentMethod;
  receiptStatus: ReceiptStatus;
  status: TransactionStatus;
}

interface AddTransactionFormProps {
  onSubmit: (data: TransactionFormData) => Promise<void>;
  accounts: string[];
  categories: string[];
}

function AddTransactionForm({
  onSubmit,
  accounts,
  categories,
}: AddTransactionFormProps) {
  const form = useForm({
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      type: "debit",
      payee: "",
      description: "",
      amount: "",
      account: accounts[0] || "Default",
      category: "",
      method: "card",
      receiptStatus: "missing",
      status: "pending",
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value as TransactionFormData);
      form.reset();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="card panel-container p-4 rounded-lg border border-slate-700 space-y-3"
    >
      <h3 className="font-bold text-sm border-b border-slate-700 pb-2">
        Add Transaction
      </h3>

      {/* Row 1: Date & Type */}
      <div className="grid grid-cols-2 gap-2">
        <form.Field name="date">
          {(field) => (
            <input
              type="date"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="px-2 py-1.5 text-sm rounded bg-slate-900 border border-slate-700"
            />
          )}
        </form.Field>
        <form.Field name="type">
          {(field) => (
            <select
              value={field.state.value}
              onChange={(e) =>
                field.handleChange(e.target.value as TransactionType)
              }
              className="px-2 py-1.5 text-sm rounded bg-slate-900 border border-slate-700"
            >
              <option value="debit">Debit (Expense)</option>
              <option value="credit">Credit (Income)</option>
            </select>
          )}
        </form.Field>
      </div>

      {/* Row 2: Payee */}
      <form.Field name="payee">
        {(field) => (
          <input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="To / From (e.g., Google Workspace)"
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-900 border border-slate-700"
          />
        )}
      </form.Field>

      {/* Row 3: Amount & Account */}
      <div className="grid grid-cols-2 gap-2">
        <form.Field name="amount">
          {(field) => (
            <input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Amount"
              type="number"
              step="0.01"
              min="0"
              className="px-2 py-1.5 text-sm rounded bg-slate-900 border border-slate-700"
            />
          )}
        </form.Field>
        <form.Field name="account">
          {(field) => (
            <input
              list="accounts-list"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Account"
              className="px-2 py-1.5 text-sm rounded bg-slate-900 border border-slate-700"
            />
          )}
        </form.Field>
        <datalist id="accounts-list">
          {accounts.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </div>

      {/* Row 4: Category & Method */}
      <div className="grid grid-cols-2 gap-2">
        <form.Field name="category">
          {(field) => (
            <input
              list="categories-list"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Category"
              className="px-2 py-1.5 text-sm rounded bg-slate-900 border border-slate-700"
            />
          )}
        </form.Field>
        <form.Field name="method">
          {(field) => (
            <select
              value={field.state.value}
              onChange={(e) =>
                field.handleChange(e.target.value as PaymentMethod)
              }
              className="px-2 py-1.5 text-sm rounded bg-slate-900 border border-slate-700"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
        </form.Field>
        <datalist id="categories-list">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {/* Row 5: Receipt & Status */}
      <div className="grid grid-cols-2 gap-2">
        <form.Field name="receiptStatus">
          {(field) => (
            <select
              value={field.state.value}
              onChange={(e) =>
                field.handleChange(e.target.value as ReceiptStatus)
              }
              className="px-2 py-1.5 text-sm rounded bg-slate-900 border border-slate-700"
            >
              {RECEIPT_STATUS.map((r) => (
                <option key={r.value} value={r.value}>
                  Receipt: {r.label}
                </option>
              ))}
            </select>
          )}
        </form.Field>
        <form.Field name="status">
          {(field) => (
            <select
              value={field.state.value}
              onChange={(e) =>
                field.handleChange(e.target.value as TransactionStatus)
              }
              className="px-2 py-1.5 text-sm rounded bg-slate-900 border border-slate-700"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  Status: {s.label}
                </option>
              ))}
            </select>
          )}
        </form.Field>
      </div>

      {/* Row 6: Description */}
      <form.Field name="description">
        {(field) => (
          <input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Description / Notes (optional)"
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-900 border border-slate-700"
          />
        )}
      </form.Field>

      {/* Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm"
        >
          Add Transaction
        </button>
        <button
          type="button"
          onClick={() => form.reset()}
          className="px-3 py-2 rounded bg-slate-700 text-sm"
        >
          Reset
        </button>
      </div>
    </form>
  );
}

/* --------------------------- Transaction Table ------------------------------ */

interface TransactionTableProps {
  transactions: Transaction[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelection: () => void;
  onDelete: (id: string) => void;
  onBulkDelete: () => void;
  onEdit: (tx: Transaction) => void;
}

function TransactionTable({
  transactions,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onDelete,
  onBulkDelete,
  onEdit,
}: TransactionTableProps) {
  // helpers reused from previous implementation
  const formatMethod = (method?: PaymentMethod) => {
    if (!method) return "-";
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const formatReceipt = (status?: ReceiptStatus) => {
    if (!status || status === "n/a") return "N/A";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusStyle = (status?: TransactionStatus) => {
    switch (status) {
      case "done":
        return "text-emerald-500";
      case "pending":
        return "text-amber-500";
      case "review":
        return "text-blue-400";
      default:
        return "text-slate-400";
    }
  };

  const truncateAccount = (account?: string) => {
    if (!account) return "-";
    if (account.length > 12) {
      return account.slice(0, 4) + " ... " + account.slice(-4);
    }
    return account;
  };

  // --- react-table setup (sorting) ---
  const [sorting, setSorting] = useState<SortingState>([]);

  const reactColumns = useMemo<ColumnDef<Transaction, any>[]>(() => {
    return [
      { accessorKey: "date", header: "Date" },
      { accessorKey: "payee", header: "To / From" },
      { accessorKey: "account", header: "Account" },
      { accessorKey: "category", header: "Category" },
      { accessorKey: "method", header: "Methods" },
      { accessorKey: "receiptStatus", header: "Receipt" },
      { accessorKey: "amount", header: "Amount" },
      { accessorKey: "status", header: "Status" },
    ];
  }, []);

  const table = useReactTable<any>({
    data: transactions as any,
    columns: reactColumns as any,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  }) as any;

  // Rows after sorting
  const sortedItems = table.getRowModel().rows.map((r) => r.original);

  // Build VirtualTable columns mirroring original table cells (renderers unchanged)
  const columns = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={
            sortedItems.length > 0 &&
            sortedItems.every((t) => selectedIds.includes(t.id))
          }
          onChange={() => {
            const allSelected =
              sortedItems.length > 0 &&
              sortedItems.every((t) => selectedIds.includes(t.id));
            if (allSelected) {
              onClearSelection();
            } else {
              onSelectAll(sortedItems.map((t) => t.id));
            }
          }}
          className="cursor-pointer"
        />
      ),
      width: "40px",
      render: (_item: Transaction) => null,
      headerAlign: "center" as const,
      align: "left" as const,
    },
    {
      key: "date",
      header: <HeaderWithSort colId="date" table={table} label="Date" />,
      width: "80px",
      render: (item: Transaction) => (
        <div className="text-xs whitespace-nowrap">
          {formatShortDate(item.date)}
        </div>
      ),
      headerAlign: "left" as const,
      align: "left" as const,
    },
    {
      key: "payee",
      header: <HeaderWithSort colId="payee" table={table} label="To / From" />,
      render: (item: Transaction) => (
        <div className="font-medium truncate max-w-45">
          {item.payee || item.description || "-"}
        </div>
      ),
      headerAlign: "left" as const,
      align: "left" as const,
    },
    {
      key: "account",
      header: <HeaderWithSort colId="account" table={table} label="Account" />,
      width: "140px",
      render: (item: Transaction) => (
        <div className="text-xs font-mono">{truncateAccount(item.account)}</div>
      ),
      headerAlign: "left" as const,
      align: "left" as const,
    },
    {
      key: "category",
      header: (
        <HeaderWithSort colId="category" table={table} label="Category" />
      ),
      width: "120px",
      render: (item: Transaction) => (
        <div className="text-xs">{item.category || "-"}</div>
      ),
      headerAlign: "left" as const,
      align: "left" as const,
    },
    {
      key: "method",
      header: <HeaderWithSort colId="method" table={table} label="Methods" />,
      width: "100px",
      render: (item: Transaction) => (
        <div className="text-xs">{formatMethod(item.method)}</div>
      ),
      headerAlign: "left" as const,
      align: "left" as const,
    },
    {
      key: "receipt",
      header: (
        <HeaderWithSort colId="receiptStatus" table={table} label="Receipt" />
      ),
      width: "100px",
      render: (item: Transaction) => (
        <div className="text-xs">{formatReceipt(item.receiptStatus)}</div>
      ),
      headerAlign: "left" as const,
      align: "left" as const,
    },
    {
      key: "amount",
      header: <HeaderWithSort colId="amount" table={table} label="Amount" />,
      width: "140px",
      render: (item: Transaction) => (
        <div
          className={`text-right font-mono text-xs ${item.type === "credit" ? "text-emerald-400" : "text-rose-400"}`}
        >
          {item.type === "credit" ? "+ " : "- "}
          {formatCurrency(item.amount)}
        </div>
      ),
      headerAlign: "right" as const,
      align: "right" as const,
    },
    {
      key: "status",
      header: <HeaderWithSort colId="status" table={table} label="Status" />,
      width: "120px",
      render: (item: Transaction) => (
        <div className={`text-xs font-medium ${getStatusStyle(item.status)}`}>
          {item.status
            ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
            : "Pending"}
        </div>
      ),
      headerAlign: "left" as const,
      align: "left" as const,
    },
    {
      key: "actions",
      header: "Actions",
      width: "80px",
      render: (item: Transaction, _idx: number) => (
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="p-1 rounded hover:bg-slate-700 transition-colors"
            title="Edit transaction"
          >
            <Pencil size={14} />
          </button>
        </div>
      ),
      headerAlign: "center" as const,
      align: "left" as const,
    },
  ];

  // selection change handler used by VirtualTable
  const handleSelectionChange = (id: string, selected: boolean) => {
    const currently = selectedIds.includes(String(id));
    if (selected !== currently) {
      onToggleSelect(String(id));
    }
  };

  // Render: custom header (driven by react-table) + virtualized body
  return (
    <div className="card border border-slate-700 rounded-lg flex-1 panel-container flex flex-col min-h-0">
      {/* Custom header rendered from react-table's header groups */}
      <div
        className="flex border-b bg-slate-50 dark:bg-slate-800/50 shrink-0"
        style={{ height: 44 }}
      >
        {/* selection column */}
        <div className="w-10 flex items-center justify-center px-2 shrink-0">
          <input
            type="checkbox"
            className="w-4 h-4 rounded"
            checked={
              sortedItems.length > 0 &&
              sortedItems.every((t) => selectedIds.includes(t.id))
            }
            onChange={() => {
              const allSelected =
                sortedItems.length > 0 &&
                sortedItems.every((t) => selectedIds.includes(t.id));
              if (allSelected) {
                onClearSelection();
              } else {
                onSelectAll(sortedItems.map((t) => t.id));
              }
            }}
          />
        </div>

        {/* Headers coming from our VirtualTable column definitions, with sort toggles */}
        {columns.map((col) => {
          // try to find a matching react-table column by accessorKey
          const rtCol = reactColumns.find(
            (c) => (c as any).accessorKey === col.key,
          );
          const canSort = !!rtCol;
          return (
            <div
              key={col.key}
              className={`flex items-center px-3 font-medium text-xs uppercase tracking-wider opacity-70 ${col.headerAlign === "right" ? "justify-end text-right" : col.headerAlign === "center" ? "justify-center text-center" : "justify-start text-left"}`}
              style={{
                width: col.width,
                flex: col.flex ?? (col.width ? undefined : 1),
                cursor: canSort ? "pointer" : "default",
              }}
              onClick={() => {
                if (!canSort) return;
                // toggle sorting for this accessor
                const accessor = (rtCol as any).accessorKey as string;
                const current = sorting.find((s) => s.id === accessor);
                const nextDirection = current?.desc ? undefined : false;
                if (!current) {
                  setSorting([{ id: accessor, desc: false }]);
                } else if (current && !current.desc) {
                  setSorting([{ id: accessor, desc: true }]);
                } else {
                  setSorting([]);
                }
              }}
            >
              <span className="flex items-center gap-2">
                {col.header}
                {/* simple sort indicator */}
                {(() => {
                  const accessor = (rtCol as any)?.accessorKey as
                    | string
                    | undefined;
                  if (!accessor) return null;
                  const s = sorting.find((x) => x.id === accessor);
                  if (!s) return <span className="opacity-40">⇅</span>;
                  return s.desc ? <span>↓</span> : <span>↑</span>;
                })()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Virtualized Body */}
      <VirtualTable
        items={sortedItems}
        columns={columns}
        // use 40px row height as requested
        rowHeight={40}
        headerHeight={0}
        // Middle-ground sizing: 5 rows (5 * 40 = 200px) plus an extra buffer to accommodate
        // DE-dependent footer height variance (AIX status bars can be taller). Chosen buffer = 60px.
        // Total height = 260px which should reliably show 5 rows while leaving footer docked below.
        height={260}
        // Informational prop indicating the footer reserve height used for layout decisions.
        // (Kept here to make the intent explicit; the layout reserves this space by setting the
        // scroll area height appropriately in the VirtualTable container.)
        footerHeight={60}
        // reduce overscan so initial rendered items are minimal (show 5 rows to start)
        overscan={5}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        onRowClick={(item) => onEdit(item)}
        isLoading={false}
        hideHeader={true}
        emptyState={
          <div className="px-4 py-8 text-center opacity-60">
            No transactions found. Add one using the form!
          </div>
        }
      />
    </div>
  );
}

/* --- Small helper component rendered inside header cells to keep code small --- */
function HeaderWithSort({
  colId,
  table,
  label,
}: {
  colId: string;
  table: any;
  label: string;
}) {
  // The helper is intentionally lightweight; we show label only here.
  return <>{label}</>;
}

/* --------------------------- Main Component ------------------------------ */

function TransactionsRoute() {
  // Query data
  const { data: transactions = [], isLoading } = useTransactions();

  // Local state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    type: "all" as TransactionType | "all",
    status: "all" as TransactionStatus | "all",
    from: "", // Default to all dates
    to: "",
    category: "",
    account: "",
    search: "",
  });
  const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );

  // Local state for edit modal
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  // Mutations
  const addMutation = useAddTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const bulkDeleteMutation = useBulkDeleteTransactions();
  const importMutation = useImportTransactions();

  // Derived data
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filters.type !== "all" && tx.type !== filters.type) return false;
      if (filters.status !== "all" && tx.status !== filters.status)
        return false;
      if (filters.from && tx.date < filters.from) return false;
      if (filters.to && tx.date > filters.to) return false;
      if (filters.category && tx.category !== filters.category) return false;
      if (filters.account && tx.account !== filters.account) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          tx.payee?.toLowerCase().includes(search) ||
          tx.description?.toLowerCase().includes(search) ||
          tx.category?.toLowerCase().includes(search) ||
          tx.account?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [transactions, filters]);

  const chartData = useMemo(() => {
    const grouped = filtered.reduce(
      (acc, tx) => {
        const amount = Number(tx.amount);
        if (isNaN(amount)) return acc;
        const date = formatChartDate(tx.date, timeRange);
        if (!acc[date]) acc[date] = { date, inflow: 0, outflow: 0, net: 0 };
        const type = (tx.type || "").toLowerCase();
        if (
          type === "debit" ||
          type === "expense" ||
          type === "withdrawal" ||
          type === "payment"
        ) {
          acc[date].outflow += amount;
        } else {
          acc[date].inflow += amount;
        }
        acc[date].net = acc[date].inflow - acc[date].outflow;
        return acc;
      },
      {} as Record<string, DailyAggregate>,
    );
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered, timeRange]);

  const categoryBreakdown = useMemo(() => {
    const grouped = filtered.reduce(
      (acc, tx) => {
        if (typeof tx.amount !== "number" || isNaN(tx.amount)) return acc;
        const cat = tx.category || "Uncategorized";
        if (!acc[cat]) acc[cat] = { category: cat, amount: 0, count: 0 };
        acc[cat].amount += tx.type === "credit" ? tx.amount : -tx.amount;
        acc[cat].count += 1;
        return acc;
      },
      {} as Record<string, CategoryBreakdown>,
    );
    return Object.values(grouped).sort(
      (a, b) => Math.abs(b.amount) - Math.abs(a.amount),
    );
  }, [filtered]);

  const netChange = useMemo(() => {
    return filtered.reduce((sum, tx) => {
      if (typeof tx.amount !== "number" || isNaN(tx.amount)) return sum;
      return sum + (tx.type === "credit" ? tx.amount : -tx.amount);
    }, 0);
  }, [filtered]);

  const accounts = useMemo(() => {
    return [...new Set(transactions.map((tx) => tx.account).filter(Boolean))];
  }, [transactions]);

  const categories = useMemo(() => {
    return [...new Set(transactions.map((tx) => tx.category).filter(Boolean))];
  }, [transactions]);

  // Handlers
  const handleAddTransaction = useCallback(
    async (data: TransactionFormData) => {
      const amount = parseFloat(data.amount);
      if (!data.payee.trim() || isNaN(amount) || amount <= 0) {
        alert("Please fill in payee and a valid amount");
        return;
      }

      await addMutation.mutateAsync({
        date: data.date,
        type: data.type,
        payee: data.payee,
        description: data.description,
        amount: amount,
        account: data.account || "Default",
        category: data.category || "Uncategorized",
        method: data.method,
        receiptStatus: data.receiptStatus,
        status: data.status,
      });
    },
    [addMutation],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm("Delete this transaction?")) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(filtered.map((tx) => tx.id));
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      type: "all",
      status: "all",
      from: "",
      to: "",
      category: "",
      account: "",
      search: "",
    });
  }, []);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
  }, []);

  const handleSaveEdit = useCallback(
    async (id: string, data: Partial<Transaction>) => {
      await updateMutation.mutateAsync({ id, data });
    },
    [updateMutation],
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} selected transactions?`)) {
      bulkDeleteMutation.mutate(selectedIds);
      clearSelection();
    }
  }, [selectedIds, bulkDeleteMutation, clearSelection]);

  // Export JSON using native dialog when available, fallback to download
  const handleExportJSON = useCallback(async () => {
    const data = transactions;
    const ok = await exportToFile(data, {
      title: "Export Transactions",
      defaultFilename: `book-keeper-${new Date().toISOString().slice(0, 10)}.json`,
      format: "json",
    }).catch(() => false);
    if (!ok) {
      // Fallback to browser download
      const json = JSON.stringify(data, null, 2);
      download(
        `book-keeper-${new Date().toISOString().slice(0, 10)}.json`,
        json,
        "application/json",
      );
    }
  }, [transactions]);

  // Export CSV using native dialog when available, fallback to download
  const handleExportCSV = useCallback(async () => {
    const csv = transactionsToCSV(transactions);
    try {
      const ok = await exportToFile(csv, {
        title: "Export Transactions (CSV)",
        defaultFilename: `book-keeper-${new Date().toISOString().slice(0, 10)}.csv`,
        format: "csv",
      }).catch(() => false);
      if (!ok) {
        download(
          `book-keeper-${new Date().toISOString().slice(0, 10)}.csv`,
          csv,
          "text/csv",
        );
      }
    } catch {
      download(
        `book-keeper-${new Date().toISOString().slice(0, 10)}.csv`,
        csv,
        "text/csv",
      );
    }
  }, [transactions]);

  /**
   * Import handler - supports both file input events (web file input)
   * and native file dialog import (call with no argument).
   */
  const handleImportFile = useCallback(
    async (e?: React.ChangeEvent<HTMLInputElement>) => {
      // If called with an input event (web file input), keep existing behavior
      if (e && e.target && e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const text = String(reader.result ?? "");
            const data = JSON.parse(text) as Transaction[];
            await importMutation.mutateAsync(data);
            alert(`Imported ${data.length} transaction(s).`);
          } catch {
            alert("Failed to import file. Ensure it's valid JSON.");
          }
        };
        reader.readAsText(file);
        e.currentTarget.value = "";
        return;
      }

      // Otherwise open native file dialog (Tauri) or web fallback via importFromFile
      try {
        const res = await importFromFile();
        if (!res) return;

        let data: Transaction[];
        if (typeof res.data === "string") {
          // try treating as CSV
          try {
            data = parseCSV(res.data) as Transaction[];
          } catch {
            // try JSON parse
            data = JSON.parse(res.data) as Transaction[];
          }
        } else {
          // JSON/structured data
          data = res.data as Transaction[];
        }
        await importMutation.mutateAsync(data);
        alert(`Imported ${data.length} transaction(s).`);
      } catch {
        alert("Failed to import file.");
      }
    },
    [importMutation],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-lg font-bold opacity-60 animate-pulse">
          Loading Database...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden pb-6">
      {/* Header */}
      <header className="shrink-0 mb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs opacity-60 mb-1">Home &gt; Transaction</div>
            <h2 className="text-xl font-bold">Transaction</h2>
            <p className="text-xs opacity-70">
              Monitor cash flow and net change across your accounts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 text-xs rounded bg-slate-700 border border-slate-600 hover:bg-slate-600"
            >
              Export JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs rounded bg-slate-700 border border-slate-600 hover:bg-slate-600"
            >
              Export CSV
            </button>
            <label className="px-3 py-1.5 text-xs rounded bg-slate-700 border border-slate-600 cursor-pointer hover:bg-slate-600">
              Import
              <input
                type="file"
                accept=".json,.txt"
                onChange={handleImportFile}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      </header>

      {/* Filter Toolbar */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        accounts={accounts}
        categories={categories}
        onSearch={() => {}}
      />

      {/* Graph Section */}
      <GraphSection
        netChange={netChange}
        chartData={chartData}
        categoryBreakdown={categoryBreakdown}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
      />

      {/* Main Content: Form + Table */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Left: Add Transaction Form */}
        <div className="w-80 shrink-0 flex flex-col min-h-0">
          <div className="card panel-container p-4 h-full overflow-auto">
            <AddTransactionForm
              onSubmit={handleAddTransaction}
              accounts={accounts}
              categories={categories}
            />
          </div>
        </div>

        {/* Right: Transaction Table */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="text-xs opacity-70">
              {filtered.length} transaction(s)
              {selectedIds.length > 0 && ` • ${selectedIds.length} selected`}
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 text-xs rounded bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Delete ({selectedIds.length})
                </button>
              )}
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-xs rounded bg-slate-700 border border-slate-600"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <TransactionTable
            transactions={filtered}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onEdit={handleEdit}
          />
        </div>
      </div>

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        transaction={editingTransaction}
        isOpen={editingTransaction !== null}
        onClose={() => setEditingTransaction(null)}
        onSave={handleSaveEdit}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}
