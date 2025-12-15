/**
 * Native File Dialog utilities for Tauri
 *
 * Provides cross-platform file open/save dialogs using Tauri APIs.
 * Falls back gracefully when running in web mode.
 */

// Check if we're running in Tauri
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

// File filter types for common formats
export interface FileFilter {
  name: string;
  extensions: string[];
}

export const FILE_FILTERS = {
  json: { name: "JSON Files", extensions: ["json"] },
  csv: { name: "CSV Files", extensions: ["csv"] },
  all: { name: "All Files", extensions: ["*"] },
  data: { name: "Data Files", extensions: ["json", "csv"] },
} as const;

/**
 * Open a native file dialog to select a file for import
 */
export async function openFileDialog(options?: {
  title?: string;
  filters?: FileFilter[];
  multiple?: boolean;
  directory?: boolean;
}): Promise<string | string[] | null> {
  if (!isTauri()) {
    // Fall back to web file input
    return openWebFileDialog(options);
  }

  try {
    const pluginPath = ["@tauri-apps", "plugin-dialog"].join("/");
    const { open } = await import(
      /* @vite-ignore */ pluginPath as unknown as string
    );

    const result = await open({
      title: options?.title ?? "Open File",
      multiple: options?.multiple ?? false,
      directory: options?.directory ?? false,
      filters: options?.filters ?? [FILE_FILTERS.data, FILE_FILTERS.all],
    });

    return result;
  } catch (error) {
    console.error("Failed to open file dialog:", error);
    // Fall back to web dialog
    return openWebFileDialog(options);
  }
}

/**
 * Web fallback for file dialog using input element
 */
function openWebFileDialog(options?: {
  filters?: FileFilter[];
  multiple?: boolean;
}): Promise<string | string[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = options?.multiple ?? false;

    // Build accept attribute from filters
    if (options?.filters) {
      const extensions = options.filters
        .flatMap((f) => f.extensions)
        .filter((e) => e !== "*")
        .map((e) => `.${e}`)
        .join(",");
      if (extensions) {
        input.accept = extensions;
      }
    }

    input.onchange = () => {
      if (!input.files || input.files.length === 0) {
        resolve(null);
        return;
      }

      // For web, we return the file contents via FileReader
      // We'll use a data URL scheme to indicate it's file content
      if (options?.multiple) {
        const promises = Array.from(input.files).map(
          (file) =>
            new Promise<string>((res) => {
              const reader = new FileReader();
              reader.onload = () => res(reader.result as string);
              reader.readAsText(file);
            }),
        );
        Promise.all(promises).then(resolve);
      } else {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(input.files[0]);
      }
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * Open a native save file dialog
 */
export async function saveFileDialog(options?: {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
}): Promise<string | null> {
  if (!isTauri()) {
    // Web doesn't have a save dialog - return a default filename
    return options?.defaultPath ?? "export.json";
  }

  try {
    const pluginPath = ["@tauri-apps", "plugin-dialog"].join("/");
    const { save } = await import(
      /* @vite-ignore */ pluginPath as unknown as string
    );

    const result = await save({
      title: options?.title ?? "Save File",
      defaultPath: options?.defaultPath,
      filters: options?.filters ?? [FILE_FILTERS.json, FILE_FILTERS.all],
    });

    return result;
  } catch (error) {
    console.error("Failed to open save dialog:", error);
    return options?.defaultPath ?? "export.json";
  }
}

/**
 * Read file contents from a path (Tauri) or directly (web)
 */
export async function readFile(pathOrContent: string): Promise<string> {
  // If it looks like file content (from web fallback), return directly
  if (
    pathOrContent.startsWith("{") ||
    pathOrContent.startsWith("[") ||
    pathOrContent.includes(",")
  ) {
    return pathOrContent;
  }

  if (!isTauri()) {
    throw new Error("Cannot read file path in web mode");
  }

  try {
    const pluginPath = ["@tauri-apps", "plugin-fs"].join("/");
    const { readTextFile } = await import(
      /* @vite-ignore */ pluginPath as unknown as string
    );
    return await readTextFile(pathOrContent);
  } catch (error) {
    console.error("Failed to read file:", error);
    throw error;
  }
}

/**
 * Write content to a file
 */
export async function writeFile(
  path: string,
  content: string,
): Promise<boolean> {
  if (!isTauri()) {
    // Web fallback: trigger download
    downloadFile(path, content);
    return true;
  }

  try {
    const pluginPath = ["@tauri-apps", "plugin-fs"].join("/");
    const { writeTextFile } = await import(
      /* @vite-ignore */ pluginPath as unknown as string
    );
    await writeTextFile(path, content);
    return true;
  } catch (error) {
    console.error("Failed to write file:", error);
    // Fall back to download
    downloadFile(path, content);
    return true;
  }
}

/**
 * Web fallback: trigger a file download
 */
export function downloadFile(filename: string, content: string): void {
  const mimeType = filename.endsWith(".csv") ? "text/csv" : "application/json";
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * High-level function to import data from a file
 * Returns parsed JSON data or CSV string
 */
export async function importFromFile<T = unknown>(options?: {
  title?: string;
  filters?: FileFilter[];
}): Promise<{ data: T; filename: string } | null> {
  const result = await openFileDialog({
    title: options?.title ?? "Import Data",
    filters: options?.filters ?? [FILE_FILTERS.data, FILE_FILTERS.all],
    multiple: false,
  });

  if (!result || Array.isArray(result)) {
    return null;
  }

  try {
    const content = await readFile(result);

    // Try to parse as JSON
    try {
      const data = JSON.parse(content) as T;
      const filename =
        typeof result === "string" && result.includes("/")
          ? (result.split("/").pop() ?? "import.json")
          : "import.json";
      return { data, filename };
    } catch {
      // Return raw content if not JSON (e.g., CSV)
      return { data: content as unknown as T, filename: "import.csv" };
    }
  } catch (error) {
    console.error("Failed to import file:", error);
    return null;
  }
}

/**
 * High-level function to export data to a file
 */
export async function exportToFile(
  data: unknown,
  options?: {
    title?: string;
    defaultFilename?: string;
    format?: "json" | "csv";
  },
): Promise<boolean> {
  const format = options?.format ?? "json";
  const defaultFilename = options?.defaultFilename ?? `export.${format}`;

  const content =
    format === "json" ? JSON.stringify(data, null, 2) : String(data);

  const filters = format === "json" ? [FILE_FILTERS.json] : [FILE_FILTERS.csv];

  const savePath = await saveFileDialog({
    title: options?.title ?? "Export Data",
    defaultPath: defaultFilename,
    filters,
  });

  if (!savePath) {
    return false;
  }

  return writeFile(savePath, content);
}

/**
 * Convert transactions to CSV format
 */
export function transactionsToCSV(
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    type: string;
    payee?: string;
    description?: string;
    account?: string;
    category?: string;
    status?: string;
  }>,
): string {
  const headers = [
    "ID",
    "Date",
    "Amount",
    "Type",
    "Payee",
    "Description",
    "Account",
    "Category",
    "Status",
  ];

  const rows = transactions.map((tx) => [
    tx.id,
    tx.date,
    tx.amount.toString(),
    tx.type,
    tx.payee ?? "",
    tx.description ?? "",
    tx.account ?? "",
    tx.category ?? "",
    tx.status ?? "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");

  return csvContent;
}

/**
 * Parse CSV content into transaction-like objects
 */
export function parseCSV(
  content: string,
): Array<Record<string, string | number>> {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const results: Array<Record<string, string | number>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj: Record<string, string | number> = {};

    headers.forEach((header, index) => {
      const key = header.toLowerCase().replace(/\s+/g, "_");
      const value = values[index] ?? "";

      // Try to parse as number
      const num = Number.parseFloat(value);
      obj[key] = Number.isNaN(num) ? value : num;
    });

    results.push(obj);
  }

  return results;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
