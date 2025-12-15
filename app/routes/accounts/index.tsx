import React, { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Wallet,
  X,
  Check,
  AlertTriangle,
  Search,
  Filter,
  MoreVertical,
  ChevronDown,
  DollarSign,
  Percent,
  Hash,
} from "lucide-react";
import { useFinanceStore, formatCurrency } from "../../stores/finance";
import type { Account, AccountType } from "../../db/types";

// Account type options
const ACCOUNT_TYPES: {
  value: AccountType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "checking", label: "Checking", icon: <Building2 size={16} /> },
  { value: "savings", label: "Savings", icon: <PiggyBank size={16} /> },
  { value: "credit", label: "Credit Card", icon: <CreditCard size={16} /> },
  { value: "investment", label: "Investment", icon: <TrendingUp size={16} /> },
  { value: "cash", label: "Cash", icon: <Wallet size={16} /> },
  { value: "other", label: "Other", icon: <Wallet size={16} /> },
];

// Color options for accounts
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

// Get icon for account type
function getAccountIcon(type: AccountType, size = 20) {
  switch (type) {
    case "checking":
      return <Building2 size={size} />;
    case "savings":
      return <PiggyBank size={size} />;
    case "credit":
      return <CreditCard size={size} />;
    case "investment":
      return <TrendingUp size={size} />;
    case "cash":
    case "other":
    default:
      return <Wallet size={size} />;
  }
}

// Default form values
const defaultFormValues: Omit<Account, "id" | "createdAt"> = {
  name: "",
  displayName: "",
  type: "checking",
  institution: "",
  lastFour: "",
  balance: 0,
  currency: "USD",
  color: "#3b82f6",
  isActive: true,
  isPrimary: false,
  creditLimit: undefined,
  interestRate: undefined,
  note: "",
};

export default function AccountsRoute() {
  const {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    getAccountSummary,
  } = useFinanceStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountType | "all">("all");
  const [showInactive, setShowInactive] = useState(false);

  // Account summary
  const summary = useMemo(() => getAccountSummary(), [accounts]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (account.institution
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ??
          false);

      // Type filter
      const matchesType = typeFilter === "all" || account.type === typeFilter;

      // Active filter
      const matchesActive = showInactive || account.isActive;

      return matchesSearch && matchesType && matchesActive;
    });
  }, [accounts, searchQuery, typeFilter, showInactive]);

  // Group accounts by type
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, Account[]> = {};
    for (const account of filteredAccounts) {
      if (!groups[account.type]) {
        groups[account.type] = [];
      }
      groups[account.type].push(account);
    }
    return groups;
  }, [filteredAccounts]);

  const handleAdd = async (data: Omit<Account, "id" | "createdAt">) => {
    await addAccount(data);
    setShowAddModal(false);
  };

  const handleEdit = async (data: Omit<Account, "id" | "createdAt">) => {
    if (editingAccount) {
      await updateAccount(editingAccount.id, data);
      setEditingAccount(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteAccount(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-sm opacity-60">
            Manage your financial accounts and track balances
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Add Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Assets"
          value={formatCurrency(summary.totalAssets)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <SummaryCard
          label="Total Liabilities"
          value={formatCurrency(summary.totalLiabilities)}
          icon={<CreditCard className="w-5 h-5" />}
          color="red"
        />
        <SummaryCard
          label="Net Worth"
          value={formatCurrency(summary.netWorth)}
          icon={<Wallet className="w-5 h-5" />}
          color={summary.netWorth >= 0 ? "blue" : "red"}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Keep the card styling on the wrapper, render icon inline, and make the input flex so they don't overlap */}
        <div className="flex-1 min-w-0 card flex items-center gap-3">
          <Search size={16} className="opacity-50 ml-2" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 pr-3 py-2 text-sm bg-transparent border-none outline-none"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as AccountType | "all")}
          className="px-3 py-2 border rounded-lg text-sm card"
        >
          <option value="all">All Types</option>
          {ACCOUNT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
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

      {/* Accounts List */}
      {filteredAccounts.length === 0 ? (
        <div className="text-center py-12 card border">
          <Wallet className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <h3 className="font-medium mb-1">No accounts found</h3>
          <p className="text-sm opacity-60 mb-4">
            {searchQuery || typeFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by adding your first account"}
          </p>
          {!searchQuery && typeFilter === "all" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Add Account
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAccounts).map(([type, accounts]) => (
            <div key={type}>
              <h3 className="text-sm font-semibold uppercase tracking-wider opacity-60 mb-3 flex items-center gap-2">
                {getAccountIcon(type as AccountType, 16)}
                {ACCOUNT_TYPES.find((t) => t.value === type)?.label || type}
                <span className="text-xs font-normal">({accounts.length})</span>
              </h3>
              <div className="grid gap-3">
                {accounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onEdit={() => setEditingAccount(account)}
                    onDelete={() => setDeleteConfirm(account.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AccountModal
          title="Add Account"
          initialValues={defaultFormValues}
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Modal */}
      {editingAccount && (
        <AccountModal
          title="Edit Account"
          initialValues={editingAccount}
          onSave={handleEdit}
          onClose={() => setEditingAccount(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <DeleteConfirmModal
          accountName={
            accounts.find((a) => a.id === deleteConfirm)?.name || "Account"
          }
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
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
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "green" | "red" | "blue";
}) {
  const colorClasses = {
    green:
      "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  };

  const textColor = {
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm opacity-60">{label}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
      <div className={`text-2xl font-bold ${textColor[color]}`}>{value}</div>
    </div>
  );
}

// Account Card Component
function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const isNegative = account.balance < 0;

  return (
    <div
      className={`card transition-opacity ${!account.isActive ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${account.color}20`,
              color: account.color,
            }}
          >
            {getAccountIcon(account.type, 24)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{account.name}</h3>
              {account.isPrimary && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full font-medium">
                  Primary
                </span>
              )}
              {!account.isActive && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 text-xs rounded-full">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-sm opacity-60">{account.displayName}</p>
            {account.institution && (
              <p className="text-xs opacity-50">{account.institution}</p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="text-right">
            <div
              className={`text-xl font-bold ${
                isNegative ? "text-red-600" : "text-green-600"
              }`}
            >
              {formatCurrency(account.balance)}
            </div>
            {account.type === "credit" && account.creditLimit && (
              <div className="text-xs opacity-60">
                Limit: {formatCurrency(account.creditLimit)}
              </div>
            )}
            {account.type === "savings" && account.interestRate && (
              <div className="text-xs opacity-60">
                APY: {account.interestRate}%
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
                <div className="absolute right-0 top-full mt-1 card border rounded-lg shadow-lg z-20 py-1 min-w-30">
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

      {account.note && (
        <p className="text-sm opacity-60 mt-3 pt-3 border-t">{account.note}</p>
      )}
    </div>
  );
}

// Account Modal Component
function AccountModal({
  title,
  initialValues,
  onSave,
  onClose,
}: {
  title: string;
  initialValues: Omit<Account, "id" | "createdAt"> | Account;
  onSave: (data: Omit<Account, "id" | "createdAt">) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: initialValues.name,
    displayName: initialValues.displayName,
    type: initialValues.type,
    institution: initialValues.institution || "",
    lastFour: initialValues.lastFour || "",
    balance: initialValues.balance,
    currency: initialValues.currency,
    color: initialValues.color,
    isActive: initialValues.isActive,
    isPrimary: initialValues.isPrimary,
    creditLimit: initialValues.creditLimit,
    interestRate: initialValues.interestRate,
    note: initialValues.note || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      displayName:
        formData.displayName ||
        `${formData.name} ... ${formData.lastFour || "****"}`,
      creditLimit:
        formData.type === "credit" ? formData.creditLimit : undefined,
      interestRate:
        formData.type === "savings" ? formData.interestRate : undefined,
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
              Account Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="e.g., Chase Checking"
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Account Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as AccountType,
                })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Institution */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Institution
            </label>
            <input
              type="text"
              value={formData.institution}
              onChange={(e) =>
                setFormData({ ...formData, institution: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="e.g., Chase Bank"
            />
          </div>

          {/* Last Four Digits */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Last 4 Digits
            </label>
            <div className="relative">
              <Hash
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
              />
              <input
                type="text"
                value={formData.lastFour}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lastFour: e.target.value.slice(0, 4),
                  })
                }
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                placeholder="1234"
                maxLength={4}
              />
            </div>
          </div>

          {/* Balance */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Current Balance *
            </label>
            <div className="relative">
              <DollarSign
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
              />
              <input
                type="number"
                value={formData.balance}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    balance: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                step="0.01"
                required
              />
            </div>
            <p className="text-xs opacity-60 mt-1">
              Use negative values for credit card balances
            </p>
          </div>

          {/* Credit Limit (for credit cards) */}
          {formData.type === "credit" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Credit Limit
              </label>
              <div className="relative">
                <DollarSign
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
                />
                <input
                  type="number"
                  value={formData.creditLimit || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      creditLimit: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                  step="0.01"
                  placeholder="15000"
                />
              </div>
            </div>
          )}

          {/* Interest Rate (for savings) */}
          {formData.type === "savings" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Interest Rate (APY)
              </label>
              <div className="relative">
                <Percent
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
                />
                <input
                  type="number"
                  value={formData.interestRate || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interestRate: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                  step="0.01"
                  placeholder="4.5"
                />
              </div>
            </div>
          )}

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
                checked={formData.isPrimary}
                onChange={(e) =>
                  setFormData({ ...formData, isPrimary: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Primary Account</span>
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
              placeholder="Optional notes about this account..."
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
              Save Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
  accountName,
  onConfirm,
  onCancel,
}: {
  accountName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold">Delete Account</h3>
            <p className="text-sm opacity-60">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm mb-6">
          Are you sure you want to delete <strong>{accountName}</strong>? This
          will not affect any transactions associated with this account.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
