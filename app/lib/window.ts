/**
 * Window control utilities for Tauri
 *
 * Provides functions to minimize, maximize, and close the native window.
 * Falls back gracefully when running in web mode (non-Tauri environment).
 */

// Check if we're running inside Tauri
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Minimize the current window
 */
export async function minimizeWindow(): Promise<void> {
  if (!isTauri()) {
    console.log("[Window] minimize (no-op in web mode)");
    return;
  }

  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  } catch (err) {
    console.error("[Window] Failed to minimize:", err);
  }
}

/**
 * Toggle maximize/restore for the current window
 */
export async function toggleMaximize(): Promise<void> {
  if (!isTauri()) {
    console.log("[Window] toggleMaximize (no-op in web mode)");
    return;
  }

  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().toggleMaximize();
  } catch (err) {
    console.error("[Window] Failed to toggle maximize:", err);
  }
}

/**
 * Close the current window
 */
export async function closeWindow(): Promise<void> {
  if (!isTauri()) {
    console.log("[Window] close (no-op in web mode)");
    return;
  }

  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  } catch (err) {
    console.error("[Window] Failed to close:", err);
  }
}

/**
 * Check if window is currently maximized
 */
export async function isMaximized(): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return await getCurrentWindow().isMaximized();
  } catch (err) {
    console.error("[Window] Failed to check maximized state:", err);
    return false;
  }
}
