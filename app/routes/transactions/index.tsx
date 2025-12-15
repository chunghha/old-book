import React, { useMemo, useState, useCallback } from "react";
import { useForm } from "@tanstack/react-form";
import { Pencil } from "lucide-react";
import useTransactionsStore, {
  Transaction,
  TransactionType,
  PaymentMethod,
  ReceiptStatus,
  TransactionStatus,
  DailyAggregate,
  CategoryBreakdown,
  formatCurrency,
  formatShortDate,
  formatChartDate,
} from "../../stores/transactions";
import { EditTransactionModal } from "../../components/EditTransactionModal";

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
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="px-3 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-700 border border-slate-400 dark:border-slate-600 rounded-sm cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="credit">Credits</option>
          <option value="debit">Debits</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.status || "all"}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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
            <div className="absolute top-full left-0 mt-1 p-3 bg-slate-800 border border-slate-600 rounded shadow-lg z-50 space-y-2">
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

  const { maxValue, points, inflowPoints, outflowPoints } = useMemo(() => {
    if (data.length === 0) {
      return { maxValue: 100, points: [], inflowPoints: "", outflowPoints: "" };
    }

    // Find max value for scaling
    let max = 0;
    for (const d of data) {
      max = Math.max(max, d.inflow, d.outflow);
    }
    max = max || 100;

    const width = 560;
    const height = 160;
    const padding = 20;
    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;

    const pts = data.map((d, i) => {
      const x = padding + (i / Math.max(data.length - 1, 1)) * usableWidth;
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
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm opacity-60">
        No data to display. Add some transactions!
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
  const top5 = breakdown.slice(0, 5);

  if (top5.length === 0) {
    return (
      <div className="text-sm opacity-60 text-center py-4">
        No expense categories yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stacked horizontal bar */}
      <div className="flex h-6 w-full border border-slate-600 rounded-sm overflow-hidden cat-bar-container">
        {top5.map((cat, i) => (
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
        {top5.map((cat) => (
          <div key={cat.category} className="flex items-center gap-2">
            <div
              className="w-3 h-3 border border-black/20 shrink-0"
              style={{ backgroundColor: cat.color }}
            />
            <span className="truncate flex-1">{cat.category}</span>
            <span className="text-[10px] opacity-60 font-mono">
              {formatCurrency(cat.total)}
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
      <div className="lg:col-span-2 p-4 border rounded-sm bg-slate-800 border-slate-700 flex flex-col gap-3 panel-container">
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
                } ${timeRange === range ? "bg-cyan-700 text-white" : "bg-slate-700 hover:bg-slate-600"}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 relative min-h-[180px] chart-frame bg-black rounded p-2">
          <LineChart data={chartData} timeRange={timeRange} />
        </div>
      </div>

      {/* Top Categories Panel */}
      <div className="p-4 border rounded-sm bg-slate-800 border-slate-700 flex flex-col gap-3 panel-container">
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
      className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-3 panel-container"
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
  const allSelected =
    transactions.length > 0 &&
    transactions.every((t) => selectedIds.includes(t.id));

  const handleSelectAll = () => {
    if (allSelected) {
      onClearSelection();
    } else {
      onSelectAll(transactions.map((t) => t.id));
    }
  };

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

  return (
    <div className="overflow-auto bg-slate-800 border border-slate-700 rounded-lg flex-1 panel-container">
      <table className="w-full text-left border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-slate-800">
          <tr className="font-bold text-xs uppercase tracking-wide">
            <th className="px-3 py-2.5 w-10 border-b border-slate-600">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="cursor-pointer"
              />
            </th>
            <th className="px-3 py-2.5 border-b border-slate-600 w-20">Date</th>
            <th className="px-3 py-2.5 border-b border-slate-600">To / From</th>
            <th className="px-3 py-2.5 border-b border-slate-600 w-28">
              Account
            </th>
            <th className="px-3 py-2.5 border-b border-slate-600 w-24">
              Category
            </th>
            <th className="px-3 py-2.5 border-b border-slate-600 w-20">
              Methods
            </th>
            <th className="px-3 py-2.5 border-b border-slate-600 w-20">
              Receipt
            </th>
            <th className="px-3 py-2.5 border-b border-slate-600 text-right w-24">
              Amount
            </th>
            <th className="px-3 py-2.5 border-b border-slate-600 w-20">
              Status
            </th>
            <th className="px-3 py-2.5 border-b border-slate-600 w-16">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr
              key={t.id}
              className="border-b border-slate-700/50 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(t.id)}
                  onChange={() => onToggleSelect(t.id)}
                  className="cursor-pointer"
                />
              </td>
              <td className="px-3 py-2 text-xs whitespace-nowrap">
                {formatShortDate(t.date)}
              </td>
              <td className="px-3 py-2">
                <div className="font-medium truncate max-w-[180px]">
                  {t.payee || t.description || "-"}
                </div>
              </td>
              <td className="px-3 py-2 text-xs font-mono">
                {truncateAccount(t.account)}
              </td>
              <td className="px-3 py-2 text-xs">{t.category || "-"}</td>
              <td className="px-3 py-2 text-xs">{formatMethod(t.method)}</td>
              <td className="px-3 py-2 text-xs">
                {formatReceipt(t.receiptStatus)}
              </td>
              <td
                className={`px-3 py-2 text-right font-mono text-xs ${t.type === "credit" ? "text-emerald-400" : "text-rose-400"}`}
              >
                {t.type === "credit" ? "+ " : "- "}
                {formatCurrency(t.amount)}
              </td>
              <td
                className={`px-3 py-2 text-xs font-medium ${getStatusStyle(t.status)}`}
              >
                {t.status
                  ? t.status.charAt(0).toUpperCase() + t.status.slice(1)
                  : "Pending"}
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => onEdit(t)}
                  className="p-1 rounded hover:bg-slate-700 transition-colors"
                  title="Edit transaction"
                >
                  <Pencil size={14} />
                </button>
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={11} className="px-3 py-8 text-center opacity-60">
                No transactions found. Add one using the form!
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------- Main Component ------------------------------ */

function TransactionsRoute() {
  // Store selectors
  const transactions = useTransactionsStore((s) => s.transactions);
  const isLoading = useTransactionsStore((s) => s.isLoading);
  const selectedIds = useTransactionsStore((s) => s.selectedIds);
  const filters = useTransactionsStore((s) => s.filters);
  const timeRange = useTransactionsStore((s) => s.timeRange);

  // Local state for edit modal
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  // Store actions
  const addTransaction = useTransactionsStore((s) => s.addTransaction);
  const updateTransaction = useTransactionsStore((s) => s.updateTransaction);
  const deleteTransaction = useTransactionsStore((s) => s.deleteTransaction);
  const bulkDelete = useTransactionsStore((s) => s.bulkDelete);
  const toggleSelect = useTransactionsStore((s) => s.toggleSelect);
  const selectAll = useTransactionsStore((s) => s.selectAll);
  const clearSelection = useTransactionsStore((s) => s.clearSelection);
  const setFilters = useTransactionsStore((s) => s.setFilters);
  const clearFilters = useTransactionsStore((s) => s.clearFilters);
  const setTimeRange = useTransactionsStore((s) => s.setTimeRange);
  const exportJSON = useTransactionsStore((s) => s.exportJSON);
  const exportCSV = useTransactionsStore((s) => s.exportCSV);
  const importJSON = useTransactionsStore((s) => s.importJSON);

  // Derived data
  const filtered = useTransactionsStore((s) => s.filtered)();
  const chartData = useTransactionsStore((s) => s.getChartData)();
  const categoryBreakdown = useTransactionsStore(
    (s) => s.getCategoryBreakdown,
  )();
  const netChange = useTransactionsStore((s) => s.getNetChange)();
  const accounts = useTransactionsStore((s) => s.getAccounts)();
  const categories = useTransactionsStore((s) => s.getCategories)();

  // Handlers
  const handleAddTransaction = useCallback(
    async (data: TransactionFormData) => {
      const amount = parseFloat(data.amount);
      if (!data.payee.trim() || isNaN(amount) || amount <= 0) {
        alert("Please fill in payee and a valid amount");
        return;
      }

      await addTransaction({
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
    [addTransaction],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm("Delete this transaction?")) {
        deleteTransaction(id);
      }
    },
    [deleteTransaction],
  );

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
  }, []);

  const handleSaveEdit = useCallback(
    async (id: string, data: Partial<Transaction>) => {
      await updateTransaction(id, data);
    },
    [updateTransaction],
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} selected transactions?`)) {
      bulkDelete(selectedIds);
      clearSelection();
    }
  }, [selectedIds, bulkDelete, clearSelection]);

  const handleExportJSON = useCallback(() => {
    const json = exportJSON();
    download(
      `book-keeper-${new Date().toISOString().slice(0, 10)}.json`,
      json,
      "application/json",
    );
  }, [exportJSON]);

  const handleExportCSV = useCallback(() => {
    const csv = exportCSV();
    download(
      `book-keeper-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      "text/csv",
    );
  }, [exportCSV]);

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const text = String(reader.result ?? "");
          const res = await importJSON(text);
          alert(`Imported ${res.added} transaction(s).`);
        } catch {
          alert("Failed to import file. Ensure it's valid JSON.");
        }
      };
      reader.readAsText(file);
      e.currentTarget.value = "";
    },
    [importJSON],
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
    <div className="h-full flex flex-col overflow-hidden">
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
        <div className="w-72 shrink-0 overflow-auto">
          <AddTransactionForm
            onSubmit={handleAddTransaction}
            accounts={accounts}
            categories={categories}
          />
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
