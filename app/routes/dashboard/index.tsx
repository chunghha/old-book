import React, { useMemo } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  PiggyBank,
  Building2,
  AlertTriangle,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronRight,
  DollarSign,
  Target,
  Repeat,
  Activity,
} from "lucide-react";
import { useFinanceStore } from "../../stores/finance";
import { useTransactionsStore } from "../../stores/transactions";
import type {
  Account,
  Budget,
  RecurringTransaction,
  Transaction,
} from "../../db/types";

// Format currency
function formatCurrency(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format percentage
function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

// Format date relative
function formatRelativeDate(dateStr: string): string {
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

// Get account type icon
function getAccountIcon(type: Account["type"]) {
  switch (type) {
    case "checking":
      return <Building2 size={16} />;
    case "savings":
      return <PiggyBank size={16} />;
    case "credit":
      return <CreditCard size={16} />;
    case "investment":
      return <TrendingUp size={16} />;
    default:
      return <Wallet size={16} />;
  }
}

// Dashboard Component
export default function DashboardRoute() {
  const {
    accounts,
    budgets,
    recurring,
    getAccountSummary,
    getBudgetProgress,
    getUpcomingRecurring,
  } = useFinanceStore();

  const { transactions } = useTransactionsStore();

  // Compute summaries
  const accountSummary = useMemo(() => getAccountSummary(), [accounts]);
  const upcomingRecurring = useMemo(
    () => getUpcomingRecurring(14),
    [recurring],
  );

  // Budget progress for active budgets
  const budgetProgressList = useMemo(() => {
    // getBudgetProgress returns an array of all active budgets with progress
    const allProgress = getBudgetProgress();

    // Create a map for quick lookup
    const progressMap = new Map(allProgress.map((p) => [p.budget.id, p]));

    return budgets
      .filter((b) => b.isActive)
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
      .sort((a, b) => b.percentage - a.percentage);
  }, [budgets, getBudgetProgress]);

  // Over budget count
  const overBudgetCount = budgetProgressList.filter(
    (b) => b.isOverBudget,
  ).length;

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTransactions = transactions.filter(
      (tx: Transaction) => new Date(tx.date) >= startOfMonth,
    );

    const income = monthTransactions
      .filter((tx: Transaction) => tx.type === "credit")
      .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);

    const expenses = monthTransactions
      .filter((tx: Transaction) => tx.type === "debit")
      .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);

    return { income, expenses, net: income - expenses };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm opacity-60">
            Welcome back! Here's your financial overview.
          </p>
        </div>
        <div className="text-sm opacity-60">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Worth */}
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Net Worth"
          value={formatCurrency(accountSummary.netWorth)}
          trend={
            accountSummary.netWorth >= 0 ? (
              <span className="text-green-600 text-xs flex items-center gap-1">
                <TrendingUp size={12} /> Positive
              </span>
            ) : (
              <span className="text-red-600 text-xs flex items-center gap-1">
                <TrendingDown size={12} /> Negative
              </span>
            )
          }
          color="blue"
        />

        {/* Monthly Income */}
        <StatCard
          icon={<ArrowUpRight className="w-5 h-5" />}
          label="Income (This Month)"
          value={formatCurrency(monthlySummary.income)}
          trend={
            <span className="text-green-600 text-xs">
              {
                transactions.filter((t: Transaction) => t.type === "credit")
                  .length
              }{" "}
              deposits
            </span>
          }
          color="green"
        />

        {/* Monthly Expenses */}
        <StatCard
          icon={<ArrowDownRight className="w-5 h-5" />}
          label="Expenses (This Month)"
          value={formatCurrency(monthlySummary.expenses)}
          trend={
            <span className="text-red-600 text-xs">
              {
                transactions.filter((t: Transaction) => t.type === "debit")
                  .length
              }{" "}
              payments
            </span>
          }
          color="red"
        />

        {/* Budget Status */}
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Budget Status"
          value={`${budgetProgressList.length} Active`}
          trend={
            overBudgetCount > 0 ? (
              <span className="text-amber-600 text-xs flex items-center gap-1">
                <AlertTriangle size={12} /> {overBudgetCount} over budget
              </span>
            ) : (
              <span className="text-green-600 text-xs flex items-center gap-1">
                <CheckCircle2 size={12} /> All on track
              </span>
            )
          }
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Accounts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Accounts Overview */}
          <Card>
            <CardHeader
              title="Accounts"
              icon={<Building2 size={18} />}
              action={
                <a
                  href="/accounts"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  View All <ChevronRight size={14} />
                </a>
              }
            />
            <div className="p-4 space-y-3">
              {/* Account Summary Row */}
              <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div>
                  <div className="text-xs opacity-60 mb-1">Total Assets</div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(accountSummary.totalAssets)}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-60 mb-1">
                    Total Liabilities
                  </div>
                  <div className="text-lg font-semibold text-red-600">
                    {formatCurrency(accountSummary.totalLiabilities)}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-60 mb-1">Net Worth</div>
                  <div
                    className={`text-lg font-semibold ${accountSummary.netWorth >= 0 ? "text-blue-600" : "text-red-600"}`}
                  >
                    {formatCurrency(accountSummary.netWorth)}
                  </div>
                </div>
              </div>

              {/* Account List */}
              <div className="space-y-2">
                {accountSummary.accountBalances
                  .filter((ab) => ab.account.isActive)
                  .slice(0, 5)
                  .map(({ account, balance }) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      balance={balance}
                    />
                  ))}

                {accountSummary.accountBalances.length === 0 && (
                  <div className="text-center py-6 text-sm opacity-60">
                    No accounts yet.{" "}
                    <a
                      href="/accounts"
                      className="text-blue-600 hover:underline"
                    >
                      Add your first account
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader
              title="Recent Transactions"
              icon={<Activity size={18} />}
              action={
                <a
                  href="/transactions"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  View All <ChevronRight size={14} />
                </a>
              }
            />
            <div className="divide-y">
              {recentTransactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}

              {recentTransactions.length === 0 && (
                <div className="text-center py-6 text-sm opacity-60">
                  No transactions yet.{" "}
                  <a
                    href="/transactions"
                    className="text-blue-600 hover:underline"
                  >
                    Add your first transaction
                  </a>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Budgets & Recurring */}
        <div className="space-y-6">
          {/* Budget Progress */}
          <Card>
            <CardHeader
              title="Budget Progress"
              icon={<Target size={18} />}
              action={
                <a
                  href="/budgets"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Manage <ChevronRight size={14} />
                </a>
              }
            />
            <div className="p-4 space-y-4">
              {budgetProgressList.slice(0, 5).map((item) => (
                <BudgetProgressRow
                  key={item.budget.id}
                  budget={item.budget}
                  percentage={item.percentage}
                  remaining={item.remaining}
                  isOverBudget={item.isOverBudget}
                />
              ))}

              {budgetProgressList.length === 0 && (
                <div className="text-center py-4 text-sm opacity-60">
                  No budgets set up yet.
                </div>
              )}
            </div>
          </Card>

          {/* Upcoming Recurring */}
          <Card>
            <CardHeader
              title="Upcoming Bills"
              icon={<Repeat size={18} />}
              action={
                <a
                  href="/recurring"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Manage <ChevronRight size={14} />
                </a>
              }
            />
            <div className="divide-y">
              {upcomingRecurring.slice(0, 5).map((item) => (
                <RecurringRow
                  key={item.recurring.id}
                  recurring={item.recurring}
                  dueDate={item.dueDate}
                  daysUntilDue={item.daysUntilDue}
                />
              ))}

              {upcomingRecurring.length === 0 && (
                <div className="text-center py-6 text-sm opacity-60">
                  No upcoming bills in the next 14 days.
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader title="Quick Actions" icon={<RefreshCw size={18} />} />
            <div className="p-4 grid grid-cols-2 gap-2">
              <QuickActionButton
                href="/transactions"
                icon={<DollarSign size={16} />}
                label="Add Transaction"
              />
              <QuickActionButton
                href="/accounts"
                icon={<Building2 size={16} />}
                label="Add Account"
              />
              <QuickActionButton
                href="/budgets"
                icon={<Target size={16} />}
                label="Set Budget"
              />
              <QuickActionButton
                href="/recurring"
                icon={<Repeat size={16} />}
                label="Add Recurring"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: React.ReactNode;
  color: "blue" | "green" | "red" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green:
      "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    purple:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs opacity-60 mb-1">{label}</div>
      {trend && <div>{trend}</div>}
    </div>
  );
}

// Card Components
function Card({ children }: { children: React.ReactNode }) {
  return <div className="card overflow-hidden">{children}</div>;
}

function CardHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50 dark:bg-slate-800/50">
      <div className="flex items-center gap-2 font-medium">
        {icon && <span className="opacity-60">{icon}</span>}
        {title}
      </div>
      {action}
    </div>
  );
}

// Account Row
function AccountRow({
  account,
  balance,
}: {
  account: Account;
  balance: number;
}) {
  const isNegative = balance < 0;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: `${account.color}20`,
            color: account.color,
          }}
        >
          {getAccountIcon(account.type)}
        </div>
        <div>
          <div className="font-medium text-sm">{account.name}</div>
          <div className="text-xs opacity-60">{account.displayName}</div>
        </div>
      </div>
      <div
        className={`text-right font-semibold ${isNegative ? "text-red-600" : "text-green-600"}`}
      >
        {formatCurrency(balance)}
      </div>
    </div>
  );
}

// Transaction Row
function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isCredit = transaction.type === "credit";

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isCredit
              ? "bg-green-100 text-green-600 dark:bg-green-900/30"
              : "bg-red-100 text-red-600 dark:bg-red-900/30"
          }`}
        >
          {isCredit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        </div>
        <div>
          <div className="font-medium text-sm">
            {transaction.payee || transaction.description || "Transaction"}
          </div>
          <div className="text-xs opacity-60">
            {transaction.category || "Uncategorized"} •{" "}
            {new Date(transaction.date).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div
        className={`font-semibold ${isCredit ? "text-green-600" : "text-red-600"}`}
      >
        {isCredit ? "+" : "-"}
        {formatCurrency(transaction.amount)}
      </div>
    </div>
  );
}

// Budget Progress Row
function BudgetProgressRow({
  budget,
  percentage,
  remaining,
  isOverBudget,
}: {
  budget: Budget;
  percentage: number;
  remaining: number;
  isOverBudget: boolean;
}) {
  const progressColor = isOverBudget
    ? "bg-red-500"
    : percentage >= 80
      ? "bg-amber-500"
      : "bg-green-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{budget.name}</span>
        <span className={isOverBudget ? "text-red-600" : "opacity-60"}>
          {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
        </span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${progressColor} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs opacity-60">
        <span>{formatPercent(percentage)} used</span>
        <span>
          {isOverBudget
            ? `${formatCurrency(Math.abs(remaining))} over`
            : `${formatCurrency(remaining)} left`}
        </span>
      </div>
    </div>
  );
}

// Recurring Row
function RecurringRow({
  recurring,
  dueDate,
  daysUntilDue,
}: {
  recurring: RecurringTransaction;
  dueDate: string;
  daysUntilDue: number;
}) {
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue <= 3;

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isOverdue
              ? "bg-red-100 text-red-600 dark:bg-red-900/30"
              : isDueSoon
                ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700"
          }`}
        >
          {isOverdue ? (
            <AlertTriangle size={16} />
          ) : isDueSoon ? (
            <Clock size={16} />
          ) : (
            <CalendarClock size={16} />
          )}
        </div>
        <div>
          <div className="font-medium text-sm">{recurring.name}</div>
          <div className="text-xs opacity-60">
            {formatRelativeDate(dueDate)}
          </div>
        </div>
      </div>
      <div
        className={`font-semibold ${recurring.type === "credit" ? "text-green-600" : "text-red-600"}`}
      >
        {recurring.type === "credit" ? "+" : "-"}
        {formatCurrency(recurring.amount)}
      </div>
    </div>
  );
}

// Quick Action Button
function QuickActionButton({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
    >
      <span className="opacity-60">{icon}</span>
      {label}
    </a>
  );
}
