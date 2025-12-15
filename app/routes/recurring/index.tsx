import React, { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Repeat,
  AlertTriangle,
  X,
  Check,
  Search,
  MoreVertical,
  DollarSign,
  Calendar,
  CalendarClock,
  Clock,
  Play,
  SkipForward,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Pause,
  RefreshCw,
} from "lucide-react";
import {
  useFinanceStore,
  formatCurrency,
  getFrequencyLabel,
} from "../../stores/finance";
import { useTransactionsStore } from "../../stores/transactions";
import type {
  RecurringTransaction,
  RecurringFrequency,
  TransactionType,
  PaymentMethod,
} from "../../db/types";

// Frequency options
const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

// Payment method options
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "ach", label: "ACH" },
  { value: "wire", label: "Wire" },
  { value: "transfer", label: "Transfer" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "incoming", label: "Incoming" },
];

// Days of week
const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

// Category suggestions
const CATEGORY_SUGGESTIONS = [
  "Salary",
  "Rent",
  "Utilities",
  "Insurance",
  "Entertainment",
  "Software",
  "Health & Fitness",
  "Shopping",
  "Transfer",
  "Investment",
  "Pets",
  "Food & Dining",
];

// Format relative date
function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "Not scheduled";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Default form values
const defaultFormValues: Omit<
  RecurringTransaction,
  "id" | "createdAt" | "lastProcessed"
> = {
  name: "",
  payee: "",
  description: "",
  amount: 0,
  type: "debit",
  category: "",
  account: "",
  destinationAccount: undefined,
  method: "ach",
  frequency: "monthly",
  dayOfMonth: 1,
  dayOfWeek: undefined,
  monthOfYear: undefined,
  startDate: new Date().toISOString().split("T")[0],
  endDate: null,
  nextDue: null,
  isActive: true,
  autoProcess: false,
  variableAmount: false,
  tags: [],
};

export default function RecurringRoute() {
  const {
    recurring,
    accounts,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    processRecurring,
    skipRecurring,
    getUpcomingRecurring,
  } = useFinanceStore();

  const { addTransaction } = useTransactionsStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecurring, setEditingRecurring] =
    useState<RecurringTransaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [processConfirm, setProcessConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState<
    RecurringFrequency | "all"
  >("all");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  // Use showOnlyActive to match the checkbox in the UI. When true, only active items are shown.
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  // Upcoming recurring
  const upcomingList = useMemo(
    () => getUpcomingRecurring(30),
    [getUpcomingRecurring],
  );

  // Filtered recurring
  const filteredRecurring = useMemo(() => {
    return recurring.filter((item) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.payee.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      // Frequency filter
      const matchesFrequency =
        frequencyFilter === "all" || item.frequency === frequencyFilter;

      // Type filter
      const matchesType = typeFilter === "all" || item.type === typeFilter;

      // Active filter - if showOnlyActive is true we only include items that are active,
      // otherwise include both active and inactive.
      const matchesActive = !showOnlyActive || item.isActive;

      return matchesSearch && matchesFrequency && matchesType && matchesActive;
    });
  }, [recurring, searchQuery, frequencyFilter, typeFilter, showOnlyActive]);

  // Summary stats
  const summary = useMemo(() => {
    const active = recurring.filter((r) => r.isActive);
    const monthlyIncome = active
      .filter((r) => r.type === "credit" && r.frequency === "monthly")
      .reduce((sum, r) => sum + r.amount, 0);
    const monthlyExpenses = active
      .filter((r) => r.type === "debit" && r.frequency === "monthly")
      .reduce((sum, r) => sum + r.amount, 0);

    // Calculate annualized totals
    const annualizedIncome = active
      .filter((r) => r.type === "credit")
      .reduce((sum, r) => {
        const multiplier = getAnnualMultiplier(r.frequency);
        return sum + r.amount * multiplier;
      }, 0);

    const annualizedExpenses = active
      .filter((r) => r.type === "debit")
      .reduce((sum, r) => {
        const multiplier = getAnnualMultiplier(r.frequency);
        return sum + r.amount * multiplier;
      }, 0);

    const upcomingCount = upcomingList.filter(
      (u) => u.daysUntilDue <= 7,
    ).length;
    const overdueCount = upcomingList.filter((u) => u.daysUntilDue < 0).length;

    return {
      activeCount: active.length,
      monthlyIncome,
      monthlyExpenses,
      monthlyNet: monthlyIncome - monthlyExpenses,
      annualizedIncome,
      annualizedExpenses,
      upcomingCount,
      overdueCount,
    };
  }, [recurring, upcomingList]);

  const handleAdd = async (
    data: Omit<RecurringTransaction, "id" | "createdAt" | "lastProcessed">,
  ) => {
    await addRecurring(data);
    setShowAddModal(false);
  };

  const handleEdit = async (
    data: Omit<RecurringTransaction, "id" | "createdAt" | "lastProcessed">,
  ) => {
    if (editingRecurring) {
      await updateRecurring(editingRecurring.id, data);
      setEditingRecurring(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteRecurring(id);
    setDeleteConfirm(null);
  };

  const handleProcess = async (id: string) => {
    // processRecurring returns transaction data (or null). If a transaction
    // object is returned, add it to the transactions store.
    const tx = await processRecurring(id);
    if (tx) {
      await addTransaction(tx);
    }
    setProcessConfirm(null);
  };

  const handleSkip = async (id: string) => {
    await skipRecurring(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recurring Transactions</h1>
          <p className="text-sm opacity-60">
            Manage subscriptions, bills, and recurring income
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Add Recurring
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Active Recurring"
          value={`${summary.activeCount} items`}
          icon={<Repeat className="w-5 h-5" />}
          color="blue"
          subtitle={`${summary.upcomingCount} due this week`}
        />
        <SummaryCard
          label="Monthly Income"
          value={formatCurrency(summary.monthlyIncome)}
          icon={<ArrowUpRight className="w-5 h-5" />}
          color="green"
        />
        <SummaryCard
          label="Monthly Expenses"
          value={formatCurrency(summary.monthlyExpenses)}
          icon={<ArrowDownRight className="w-5 h-5" />}
          color="red"
        />
        <SummaryCard
          label="Upcoming"
          value={
            summary.overdueCount > 0
              ? `${summary.overdueCount} overdue`
              : `${summary.upcomingCount} this week`
          }
          icon={<CalendarClock className="w-5 h-5" />}
          color={summary.overdueCount > 0 ? "red" : "purple"}
          subtitle={
            summary.overdueCount > 0 ? "Needs attention" : "All on schedule"
          }
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-0 card flex items-center gap-3 px-3">
          <Search size={16} className="opacity-50" />
          <input
            type="text"
            placeholder="Search recurring..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 pr-3 py-2 text-sm bg-transparent border-none outline-none"
          />
        </div>

        <select
          value={frequencyFilter}
          onChange={(e) =>
            setFrequencyFilter(e.target.value as RecurringFrequency | "all")
          }
          className="px-3 py-2 border rounded-lg text-sm card"
        >
          <option value="all">All Frequencies</option>
          {FREQUENCY_OPTIONS.map((freq) => (
            <option key={freq.value} value={freq.value}>
              {freq.label}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as TransactionType | "all")
          }
          className="px-3 py-2 border rounded-lg text-sm card"
        >
          <option value="all">All Types</option>
          <option value="credit">Income</option>
          <option value="debit">Expense</option>
        </select>

        <label className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm card cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyActive}
            onChange={(e) => setShowOnlyActive(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span>Show Active Only</span>
        </label>
      </div>

      {/* Recurring List */}
      {filteredRecurring.length === 0 ? (
        <div className="text-center py-12 card border">
          <Repeat className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <h3 className="font-medium mb-1">No recurring transactions found</h3>
          <p className="text-sm opacity-60 mb-4">
            {searchQuery || frequencyFilter !== "all" || typeFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by adding your first recurring transaction"}
          </p>
          {!searchQuery &&
            frequencyFilter === "all" &&
            typeFilter === "all" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors text-sm font-medium"
              >
                Add Recurring
              </button>
            )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRecurring.map((item) => {
            const upcoming = upcomingList.find(
              (u) => u.recurring.id === item.id,
            );
            return (
              <RecurringCard
                key={item.id}
                recurring={item}
                daysUntilDue={upcoming?.daysUntilDue}
                onEdit={() => setEditingRecurring(item)}
                onDelete={() => setDeleteConfirm(item.id)}
                onProcess={() => setProcessConfirm(item.id)}
                onSkip={() => handleSkip(item.id)}
              />
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <RecurringModal
          title="Add Recurring Transaction"
          initialValues={defaultFormValues}
          accounts={accounts}
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Modal */}
      {editingRecurring && (
        <RecurringModal
          title="Edit Recurring Transaction"
          initialValues={editingRecurring}
          accounts={accounts}
          onSave={handleEdit}
          onClose={() => setEditingRecurring(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmModal
          title="Delete Recurring"
          message={`Are you sure you want to delete "${recurring.find((r) => r.id === deleteConfirm)?.name}"? This will not affect past transactions.`}
          confirmLabel="Delete"
          confirmColor="red"
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Process Confirmation */}
      {processConfirm && (
        <ConfirmModal
          title="Process Now"
          message={`Create a transaction for "${recurring.find((r) => r.id === processConfirm)?.name}" now? This will mark it as processed and schedule the next occurrence.`}
          confirmLabel="Process"
          confirmColor="blue"
          onConfirm={() => handleProcess(processConfirm)}
          onCancel={() => setProcessConfirm(null)}
        />
      )}
    </div>
  );
}

// Get annual multiplier for frequency
function getAnnualMultiplier(frequency: RecurringFrequency): number {
  switch (frequency) {
    case "daily":
      return 365;
    case "weekly":
      return 52;
    case "biweekly":
      return 26;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "yearly":
      return 1;
    default:
      return 12;
  }
}

// Summary Card Component
function SummaryCard({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "green" | "red" | "blue" | "purple";
  subtitle?: string;
}) {
  const colorClasses = {
    green:
      "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    purple:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  };

  const textColor = {
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm opacity-60">{label}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
      <div className={`text-xl font-bold ${textColor[color]}`}>{value}</div>
      {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
    </div>
  );
}

// Recurring Card Component
function RecurringCard({
  recurring,
  daysUntilDue,
  onEdit,
  onDelete,
  onProcess,
  onSkip,
}: {
  recurring: RecurringTransaction;
  daysUntilDue?: number;
  onEdit: () => void;
  onDelete: () => void;
  onProcess: () => void;
  onSkip: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const isOverdue = daysUntilDue !== undefined && daysUntilDue < 0;
  const isDueSoon =
    daysUntilDue !== undefined && daysUntilDue <= 3 && daysUntilDue >= 0;
  const isCredit = recurring.type === "credit";

  const statusIcon = isOverdue ? (
    <AlertTriangle size={16} className="text-red-600" />
  ) : isDueSoon ? (
    <Clock size={16} className="text-amber-600" />
  ) : (
    <CheckCircle2 size={16} className="text-green-600" />
  );

  return (
    <div
      className={`card transition-opacity ${!recurring.isActive ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isCredit
                ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                : "bg-red-100 text-red-600 dark:bg-red-900/30"
            }`}
          >
            {isCredit ? (
              <ArrowUpRight size={20} />
            ) : (
              <ArrowDownRight size={20} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{recurring.name}</h3>
              {!recurring.isActive && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 text-xs rounded-full">
                  Inactive
                </span>
              )}
              {recurring.autoProcess && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full">
                  Auto
                </span>
              )}
              {recurring.variableAmount && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs rounded-full">
                  Variable
                </span>
              )}
            </div>
            <p className="text-sm opacity-60">{recurring.payee}</p>
            <div className="flex items-center gap-3 mt-1 text-xs opacity-60">
              <span>{recurring.category}</span>
              <span>•</span>
              <span>{getFrequencyLabel(recurring.frequency)}</span>
              <span>•</span>
              <span>{recurring.account}</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="text-right">
            <div
              className={`text-lg font-bold ${
                isCredit ? "text-green-600" : "text-red-600"
              }`}
            >
              {isCredit ? "+" : "-"}
              {formatCurrency(recurring.amount)}
            </div>
            {recurring.nextDue && (
              <div className="flex items-center gap-1 justify-end text-xs">
                {statusIcon}
                <span
                  className={
                    isOverdue
                      ? "text-red-600"
                      : isDueSoon
                        ? "text-amber-600"
                        : "opacity-60"
                  }
                >
                  {formatRelativeDate(recurring.nextDue)}
                </span>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 card border rounded-lg shadow-lg z-20 py-1 min-w-40">
                  {recurring.isActive && recurring.nextDue && (
                    <>
                      <button
                        onClick={() => {
                          onProcess();
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Play size={14} />
                        Process Now
                      </button>
                      <button
                        onClick={() => {
                          onSkip();
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                      >
                        <SkipForward size={14} />
                        Skip This Period
                      </button>
                      <div className="border-t my-1" />
                    </>
                  )}
                  <button
                    onClick={() => {
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {recurring.description && (
        <p className="text-sm opacity-60 mt-3 pt-3 border-t">
          {recurring.description}
        </p>
      )}
    </div>
  );
}

// Recurring Modal Component
function RecurringModal({
  title,
  initialValues,
  accounts,
  onSave,
  onClose,
}: {
  title: string;
  initialValues:
    | Omit<RecurringTransaction, "id" | "createdAt" | "lastProcessed">
    | RecurringTransaction;
  accounts: Array<{ id: string; displayName: string; isActive: boolean }>;
  onSave: (
    data: Omit<RecurringTransaction, "id" | "createdAt" | "lastProcessed">,
  ) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: initialValues.name,
    payee: initialValues.payee,
    description: initialValues.description || "",
    amount: initialValues.amount,
    type: initialValues.type,
    category: initialValues.category,
    account: initialValues.account,
    destinationAccount: initialValues.destinationAccount || "",
    method: initialValues.method,
    frequency: initialValues.frequency,
    dayOfMonth: initialValues.dayOfMonth || 1,
    dayOfWeek: initialValues.dayOfWeek,
    monthOfYear: initialValues.monthOfYear,
    startDate: initialValues.startDate,
    endDate: initialValues.endDate || "",
    nextDue: initialValues.nextDue || "",
    isActive: initialValues.isActive,
    autoProcess: initialValues.autoProcess,
    variableAmount: initialValues.variableAmount || false,
    tags: initialValues.tags || [],
  });

  const showDayOfMonth = ["monthly", "quarterly", "yearly"].includes(
    formData.frequency,
  );
  const showDayOfWeek = ["weekly", "biweekly"].includes(formData.frequency);
  const showMonthOfYear = formData.frequency === "yearly";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      description: formData.description || undefined,
      destinationAccount: formData.destinationAccount || undefined,
      dayOfMonth: showDayOfMonth ? formData.dayOfMonth : undefined,
      dayOfWeek: showDayOfWeek ? formData.dayOfWeek : undefined,
      monthOfYear: showMonthOfYear ? formData.monthOfYear : undefined,
      endDate: formData.endDate || null,
      nextDue: formData.nextDue || null,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
    });
  };

  const activeAccounts = accounts.filter((a) => a.isActive);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 card">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="e.g., Netflix Subscription"
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "debit" })}
                className={`flex-1 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  formData.type === "debit"
                    ? "bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400"
                    : "hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <ArrowDownRight size={16} className="inline mr-1" />
                Expense
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "credit" })}
                className={`flex-1 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  formData.type === "credit"
                    ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400"
                    : "hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <ArrowUpRight size={16} className="inline mr-1" />
                Income
              </button>
            </div>
          </div>

          {/* Payee */}
          <div>
            <label className="block text-sm font-medium mb-1">Payee *</label>
            <input
              type="text"
              value={formData.payee}
              onChange={(e) =>
                setFormData({ ...formData, payee: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="e.g., Netflix"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1">Amount *</label>
            <div className="relative">
              <DollarSign
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
              />
              <input
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <input
              type="text"
              list="recurring-category-suggestions"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Select or type a category"
              required
            />
            <datalist id="recurring-category-suggestions">
              {CATEGORY_SUGGESTIONS.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium mb-1">Account *</label>
            <select
              value={formData.account}
              onChange={(e) =>
                setFormData({ ...formData, account: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            >
              <option value="">Select account</option>
              {activeAccounts.map((acc) => (
                <option key={acc.id} value={acc.displayName}>
                  {acc.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Method */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Payment Method
            </label>
            <select
              value={formData.method}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  method: e.target.value as PaymentMethod,
                })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Frequency *
            </label>
            <select
              value={formData.frequency}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  frequency: e.target.value as RecurringFrequency,
                })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            >
              {FREQUENCY_OPTIONS.map((freq) => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>

          {/* Day of Month */}
          {showDayOfMonth && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Day of Month
              </label>
              <input
                type="number"
                value={formData.dayOfMonth}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dayOfMonth: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg text-sm"
                min="1"
                max="31"
              />
            </div>
          )}

          {/* Day of Week */}
          {showDayOfWeek && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Day of Week
              </label>
              <select
                value={formData.dayOfWeek ?? 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dayOfWeek: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium mb-1">
              End Date (optional)
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Active</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoProcess}
                onChange={(e) =>
                  setFormData({ ...formData, autoProcess: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Auto-process</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.variableAmount}
                onChange={(e) =>
                  setFormData({ ...formData, variableAmount: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Variable amount</span>
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={2}
              placeholder="Optional description..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Check size={16} />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Confirm Modal Component
function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: "red" | "amber" | "blue";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const buttonColors = {
    red: "bg-red-600 hover:bg-red-700",
    amber: "bg-amber-600 hover:bg-amber-700",
    blue: "bg-blue-600 hover:bg-blue-700",
  };

  const iconColors = {
    red: "bg-red-100 dark:bg-red-900/30 text-red-600",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${iconColors[confirmColor]}`}
          >
            {confirmColor === "blue" ? (
              <Play className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
          </div>
        </div>

        <p className="text-sm mb-6 opacity-80">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors ${buttonColors[confirmColor]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
