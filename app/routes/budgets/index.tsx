import React, { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Target,
  AlertTriangle,
  X,
  Check,
  Search,
  MoreVertical,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Clock,
  PieChart,
} from "lucide-react";
import {
  useFinanceStore,
  formatCurrency,
  formatPercentage,
  getBudgetStatusColor,
} from "../../stores/finance";
import type { Budget, BudgetPeriod } from "../../db/types";

// Budget period options
const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

// Color options for budgets
const COLOR_OPTIONS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f97316", // orange
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f59e0b", // amber
  "#14b8a6", // teal
  "#64748b", // slate
];

// Category suggestions
const CATEGORY_SUGGESTIONS = [
  "Rent",
  "Groceries",
  "Transportation",
  "Entertainment",
  "Utilities",
  "Food & Dining",
  "Shopping",
  "Health & Fitness",
  "Software",
  "Insurance",
  "Travel",
  "Pets",
  "Education",
  "Personal Care",
  "Gifts",
  "Uncategorized",
];

// Default form values
const defaultFormValues: Omit<Budget, "id" | "createdAt" | "spent"> = {
  name: "",
  category: "",
  amount: 0,
  period: "monthly",
  color: "#3b82f6",
  icon: undefined,
  isActive: true,
  rollover: false,
  alertThreshold: 80,
  note: "",
  startDate: undefined,
  endDate: undefined,
};

export default function BudgetsRoute() {
  const {
    budgets,
    addBudget,
    updateBudget,
    deleteBudget,
    resetBudgetSpending,
    getBudgetProgress,
  } = useFinanceStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<BudgetPeriod | "all">("all");
  const [showInactive, setShowInactive] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "progress" | "amount">(
    "progress",
  );

  // Budget progress calculations
  const budgetProgressList = useMemo(() => {
    // Get all budget progress data
    const allProgress = getBudgetProgress();

    // Create a map for quick lookup
    const progressMap = new Map(allProgress.map((p) => [p.budget.id, p]));

    return budgets
      .map((budget) => {
        const progress = progressMap.get(budget.id);
        return {
          budget,
          percentage:
            progress?.percentage ??
            (budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0),
          remaining: progress?.remaining ?? budget.amount - budget.spent,
          isOverBudget: progress?.isOverBudget ?? budget.spent > budget.amount,
          daysRemaining: progress?.daysRemaining ?? 0,
        };
      })
      .filter((item) => {
        // Search filter
        const matchesSearch =
          searchQuery === "" ||
          item.budget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.budget.category
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        // Period filter
        const matchesPeriod =
          periodFilter === "all" || item.budget.period === periodFilter;

        // Active filter
        const matchesActive = showInactive || item.budget.isActive;

        return matchesSearch && matchesPeriod && matchesActive;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "progress":
            return b.percentage - a.percentage;
          case "amount":
            return b.budget.amount - a.budget.amount;
          case "name":
          default:
            return a.budget.name.localeCompare(b.budget.name);
        }
      });
  }, [
    budgets,
    searchQuery,
    periodFilter,
    showInactive,
    sortBy,
    getBudgetProgress,
  ]);

  // Summary stats
  const summary = useMemo(() => {
    const activeBudgets = budgetProgressList.filter((b) => b.budget.isActive);
    const totalBudgeted = activeBudgets.reduce(
      (sum, b) => sum + b.budget.amount,
      0,
    );
    const totalSpent = activeBudgets.reduce(
      (sum, b) => sum + b.budget.spent,
      0,
    );
    const overBudgetCount = activeBudgets.filter((b) => b.isOverBudget).length;
    const onTrackCount = activeBudgets.filter(
      (b) => !b.isOverBudget && b.percentage < 80,
    ).length;
    const warningCount = activeBudgets.filter(
      (b) => !b.isOverBudget && b.percentage >= 80,
    ).length;

    return {
      totalBudgeted,
      totalSpent,
      totalRemaining: totalBudgeted - totalSpent,
      overBudgetCount,
      onTrackCount,
      warningCount,
      activeCount: activeBudgets.length,
    };
  }, [budgetProgressList]);

  const handleAdd = async (
    data: Omit<Budget, "id" | "createdAt" | "spent">,
  ) => {
    await addBudget(data);
    setShowAddModal(false);
  };

  const handleEdit = async (
    data: Omit<Budget, "id" | "createdAt" | "spent">,
  ) => {
    if (editingBudget) {
      await updateBudget(editingBudget.id, data);
      setEditingBudget(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteBudget(id);
    setDeleteConfirm(null);
  };

  const handleReset = async (id: string) => {
    await resetBudgetSpending(id, undefined);
    setResetConfirm(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-sm opacity-60">
            Track spending limits and stay on target
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Add Budget
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Budgeted"
          value={formatCurrency(summary.totalBudgeted)}
          icon={<Target className="w-5 h-5" />}
          color="blue"
        />
        <SummaryCard
          label="Total Spent"
          value={formatCurrency(summary.totalSpent)}
          icon={<TrendingDown className="w-5 h-5" />}
          color={summary.totalSpent > summary.totalBudgeted ? "red" : "green"}
          subtitle={`${formatPercentage(
            summary.totalBudgeted > 0
              ? (summary.totalSpent / summary.totalBudgeted) * 100
              : 0,
          )} of budget`}
        />
        <SummaryCard
          label="Remaining"
          value={formatCurrency(summary.totalRemaining)}
          icon={<TrendingUp className="w-5 h-5" />}
          color={summary.totalRemaining >= 0 ? "green" : "red"}
        />
        <SummaryCard
          label="Budget Status"
          value={`${summary.onTrackCount} on track`}
          icon={<PieChart className="w-5 h-5" />}
          color="purple"
          subtitle={
            summary.overBudgetCount > 0
              ? `${summary.overBudgetCount} over, ${summary.warningCount} warning`
              : `${summary.warningCount} near limit`
          }
        />
      </div>

      {/* Overall Progress Bar */}
      {summary.activeCount > 0 && (
        <div className="card border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Budget Progress</span>
            <span className="text-sm opacity-60">
              {formatCurrency(summary.totalSpent)} /{" "}
              {formatCurrency(summary.totalBudgeted)}
            </span>
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                summary.totalSpent > summary.totalBudgeted
                  ? "bg-red-500"
                  : summary.totalSpent / summary.totalBudgeted >= 0.8
                    ? "bg-amber-500"
                    : "bg-green-500"
              }`}
              style={{
                width: `${Math.min(
                  (summary.totalSpent / summary.totalBudgeted) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-0 card flex items-center gap-3 px-3">
          <Search size={16} className="opacity-50" />
          <input
            type="text"
            placeholder="Search budgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 pr-3 py-2 text-sm bg-transparent border-none outline-none"
          />
        </div>

        <select
          value={periodFilter}
          onChange={(e) =>
            setPeriodFilter(e.target.value as BudgetPeriod | "all")
          }
          className="px-3 py-2 border rounded-lg text-sm card"
        >
          <option value="all">All Periods</option>
          {PERIOD_OPTIONS.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as "name" | "progress" | "amount")
          }
          className="px-3 py-2 border rounded-lg text-sm card"
        >
          <option value="progress">Sort by Progress</option>
          <option value="amount">Sort by Amount</option>
          <option value="name">Sort by Name</option>
        </select>

        <label className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm card cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span>Show Inactive</span>
        </label>
      </div>

      {/* Budgets List */}
      {budgetProgressList.length === 0 ? (
        <div className="text-center py-12 card border">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <h3 className="font-medium mb-1">No budgets found</h3>
          <p className="text-sm opacity-60 mb-4">
            {searchQuery || periodFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by creating your first budget"}
          </p>
          {!searchQuery && periodFilter === "all" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Create Budget
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {budgetProgressList.map((item) => (
            <BudgetCard
              key={item.budget.id}
              budget={item.budget}
              percentage={item.percentage}
              remaining={item.remaining}
              isOverBudget={item.isOverBudget}
              daysRemaining={item.daysRemaining}
              onEdit={() => setEditingBudget(item.budget)}
              onDelete={() => setDeleteConfirm(item.budget.id)}
              onReset={() => setResetConfirm(item.budget.id)}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <BudgetModal
          title="Create Budget"
          initialValues={defaultFormValues}
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Modal */}
      {editingBudget && (
        <BudgetModal
          title="Edit Budget"
          initialValues={editingBudget}
          onSave={handleEdit}
          onClose={() => setEditingBudget(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmModal
          title="Delete Budget"
          message={`Are you sure you want to delete "${budgets.find((b) => b.id === deleteConfirm)?.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmColor="red"
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Reset Confirmation */}
      {resetConfirm && (
        <ConfirmModal
          title="Reset Spending"
          message={`Are you sure you want to reset the spending for "${budgets.find((b) => b.id === resetConfirm)?.name}"? This will set the spent amount to $0.`}
          confirmLabel="Reset"
          confirmColor="amber"
          onConfirm={() => handleReset(resetConfirm)}
          onCancel={() => setResetConfirm(null)}
        />
      )}
    </div>
  );
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

// Budget Card Component
function BudgetCard({
  budget,
  percentage,
  remaining,
  isOverBudget,
  daysRemaining,
  onEdit,
  onDelete,
  onReset,
}: {
  budget: Budget;
  percentage: number;
  remaining: number;
  isOverBudget: boolean;
  daysRemaining: number;
  onEdit: () => void;
  onDelete: () => void;
  onReset: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const statusColor = isOverBudget
    ? "text-red-600"
    : percentage >= 80
      ? "text-amber-600"
      : "text-green-600";

  const progressColor = isOverBudget
    ? "bg-red-500"
    : percentage >= 80
      ? "bg-amber-500"
      : "bg-green-500";

  const statusIcon = isOverBudget ? (
    <AlertTriangle size={16} className="text-red-600" />
  ) : percentage >= 80 ? (
    <Clock size={16} className="text-amber-600" />
  ) : (
    <CheckCircle2 size={16} className="text-green-600" />
  );

  return (
    <div
      className={`card transition-opacity ${!budget.isActive ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${budget.color}20`,
              color: budget.color,
            }}
          >
            <Target size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{budget.name}</h3>
              {!budget.isActive && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 text-xs rounded-full">
                  Inactive
                </span>
              )}
              {budget.rollover && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full">
                  Rollover
                </span>
              )}
            </div>
            <p className="text-sm opacity-60">{budget.category}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right mr-2">
            <div className="flex items-center gap-2 justify-end">
              {statusIcon}
              <span className={`font-bold ${statusColor}`}>
                {formatPercentage(percentage)}
              </span>
            </div>
            <p className="text-xs opacity-60">
              {PERIOD_OPTIONS.find((p) => p.value === budget.period)?.label}
            </p>
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
                <div className="absolute right-0 top-full mt-1 card border rounded-lg shadow-lg z-20 py-1 min-w-35">
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
                      onReset();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <RefreshCw size={14} />
                    Reset Spending
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

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-medium">{formatCurrency(budget.spent)}</span>
            <span className="opacity-60">
              {" "}
              / {formatCurrency(budget.amount)}
            </span>
          </div>
          <div className={isOverBudget ? "text-red-600" : "opacity-60"}>
            {isOverBudget
              ? `${formatCurrency(Math.abs(remaining))} over`
              : `${formatCurrency(remaining)} left`}
          </div>
        </div>

        {daysRemaining > 0 && (
          <p className="text-xs opacity-50">
            {daysRemaining} days remaining in period
          </p>
        )}
      </div>

      {budget.note && (
        <p className="text-sm opacity-60 mt-3 pt-3 border-t">{budget.note}</p>
      )}
    </div>
  );
}

// Budget Modal Component
function BudgetModal({
  title,
  initialValues,
  onSave,
  onClose,
}: {
  title: string;
  initialValues: Omit<Budget, "id" | "createdAt" | "spent"> | Budget;
  onSave: (data: Omit<Budget, "id" | "createdAt" | "spent">) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: initialValues.name,
    category: initialValues.category,
    amount: initialValues.amount,
    period: initialValues.period,
    color: initialValues.color,
    icon: initialValues.icon || "",
    isActive: initialValues.isActive,
    rollover: initialValues.rollover,
    alertThreshold: initialValues.alertThreshold,
    note: initialValues.note || "",
    startDate: initialValues.startDate || "",
    endDate: initialValues.endDate || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      icon: formData.icon || undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
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
            <label className="block text-sm font-medium mb-1">
              Budget Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="e.g., Groceries"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <input
              type="text"
              list="category-suggestions"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Select or type a category"
              required
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Budget Amount *
            </label>
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

          {/* Period */}
          <div>
            <label className="block text-sm font-medium mb-1">Period *</label>
            <select
              value={formData.period}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  period: e.target.value as BudgetPeriod,
                })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            >
              {PERIOD_OPTIONS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>

          {/* Alert Threshold */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Alert Threshold ({formData.alertThreshold}%)
            </label>
            <input
              type="range"
              value={formData.alertThreshold}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  alertThreshold: parseInt(e.target.value),
                })
              }
              className="w-full"
              min="50"
              max="100"
              step="5"
            />
            <p className="text-xs opacity-60 mt-1">
              Get warned when spending exceeds this percentage
            </p>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? "border-slate-900 dark:border-white scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
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
                checked={formData.rollover}
                onChange={(e) =>
                  setFormData({ ...formData, rollover: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Rollover unused amount</span>
            </label>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <textarea
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={2}
              placeholder="Optional notes about this budget..."
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
              Save Budget
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
            <AlertTriangle className="w-5 h-5" />
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
