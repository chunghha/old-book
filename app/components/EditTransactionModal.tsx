import React, { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { X } from "lucide-react";
import {
  Transaction,
  TransactionType,
  PaymentMethod,
  ReceiptStatus,
  TransactionStatus,
} from "../db/types";

interface EditTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Transaction>) => Promise<void>;
  accounts: string[];
  categories: string[];
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

interface FormData {
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

export function EditTransactionModal({
  transaction,
  isOpen,
  onClose,
  onSave,
  accounts,
  categories,
}: EditTransactionModalProps) {
  const form = useForm<FormData>({
    defaultValues: {
      date: "",
      type: "debit",
      payee: "",
      description: "",
      amount: "",
      account: "",
      category: "",
      method: "card",
      receiptStatus: "missing",
      status: "pending",
    },
    onSubmit: async ({ value }) => {
      if (!transaction) return;

      const amount = parseFloat(value.amount);
      if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      await onSave(transaction.id, {
        date: value.date,
        type: value.type,
        payee: value.payee,
        description: value.description,
        amount: amount,
        account: value.account || "Default",
        category: value.category || "Uncategorized",
        method: value.method,
        receiptStatus: value.receiptStatus,
        status: value.status,
      });

      onClose();
    },
  });

  // Update form when transaction changes
  useEffect(() => {
    if (transaction && isOpen) {
      form.setFieldValue("date", transaction.date?.slice(0, 10) || "");
      form.setFieldValue("type", transaction.type || "debit");
      form.setFieldValue("payee", transaction.payee || "");
      form.setFieldValue("description", transaction.description || "");
      form.setFieldValue("amount", transaction.amount?.toString() || "");
      form.setFieldValue("account", transaction.account || "");
      form.setFieldValue("category", transaction.category || "");
      form.setFieldValue("method", transaction.method || "card");
      form.setFieldValue("receiptStatus", transaction.receiptStatus || "missing");
      form.setFieldValue("status", transaction.status || "pending");
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold">Edit Transaction</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="p-4 space-y-4"
        >
          {/* Row 1: Date & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 opacity-70">
                Date
              </label>
              <form.Field name="date">
                {(field) => (
                  <input
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:outline-none"
                  />
                )}
              </form.Field>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 opacity-70">
                Type
              </label>
              <form.Field name="type">
                {(field) => (
                  <select
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.value as TransactionType)
                    }
                    className="w-full px-3 py-2 text-sm rounded bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="debit">Debit (Expense)</option>
                    <option value="credit">Credit (Income)</option>
                  </select>
                )}
              </form.Field>
            </div>
          </div>

          {/* Row 2: Payee */}
          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">
              To / From
            </label>
            <form.Field name="payee">
              {(field) => (
                <input
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Payee name"
                  className="w-full px-3 py-2 text-sm rounded bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:outline-none"
                />
              )}
            </form.Field>
          </div>

          {/* Row 3: Amount & Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 opacity-70">
                Amount
              </label>
              <form.Field name="amount">
                {(field) => (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm rounded bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:outline-none"
                  />
                )}
              </form.Field>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 opacity-70">
                Account
              </label>
              <form.Field name="account">
                {(field) => (
                  <input
                    type="text"
                    list="edit-accounts-list"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Account"
                    className="w-full px-3 py-2 text-sm rounded bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:outline-none"
                  />
                )}
              </form.Field>
              <datalist id="edit-accounts-list">
                {accounts.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Row 4: Category & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 opacity-70">
                Category
              </label>
              <form.Field name="category">
                {(field) => (
                  <input
                    type="text"
                    list="edit-categories-list"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Category"
                    className="w-full px-3 py-2 text-sm rounded bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:outline-none"
                  />
                )}
              </form.Field>
              <datalist id="edit-categories-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 opacity-70">
                Payment Method
              </label>
              <form.Field name="method">
                {(field) => (
                  <select
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.value as PaymentMethod)
                    }
                    className="w-full px-3 py-2 text-sm rounded bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:outline-none"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                )}
              </form.Field>
            </div>
          </div>

          {/* Row 5: Receipt & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 opacity-70">
                Receipt
              </label>
              <form.Field name="receiptStatus">
                {(field) => (
                  <select
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.value as ReceiptStatus)
                    }
                    className="w-full px-3 py-2 text-sm rounded bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:outline-none"
                  >
                    {RECEIPT_STATUS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                )}
              </form.Field>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 opacity-70">
                Status
              </label>
              <form.Field name="status">
                {(field) => (
                  <select
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.value as TransactionStatus)
                    }
                    className="w-full px-3 py-2 text-sm rounded bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                )}
              </form.Field>
            </div>
          </div>

          {/* Row 6: Description */}
          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">
              Description / Notes
            </label>
            <form.Field name="description">
              {(field) => (
                <textarea
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:outline-none resize-none"
                />
              )}
            </form.Field>
          </div>

          {/* Transaction ID (read-only) */}
          <div className="text-xs opacity-50 font-mono">
            ID: {transaction.id}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditTransactionModal;
