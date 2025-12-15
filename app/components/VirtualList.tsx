import React, {
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";

/**
 * Props for rendering each item in the virtual list
 */
export interface VirtualItemRenderProps<T> {
  item: T;
  index: number;
  virtualItem: VirtualItem;
  style: React.CSSProperties;
}

/**
 * Props for the VirtualList component
 */
export interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Estimated size of each item in pixels */
  estimateSize?: number;
  /** Function to render each item */
  renderItem: (props: VirtualItemRenderProps<T>) => React.ReactNode;
  /** Optional key extractor for items */
  getItemKey?: (index: number, item: T) => string | number;
  /** Container height - defaults to 100% of parent */
  height?: string | number;
  /** Overscan count - how many items to render outside viewport */
  overscan?: number;
  /** Optional className for the scroll container */
  className?: string;
  /** Optional className for the inner container */
  innerClassName?: string;
  /** Gap between items in pixels */
  gap?: number;
  /** Empty state component */
  emptyState?: React.ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Loading component */
  loadingState?: React.ReactNode;
  /** Horizontal mode */
  horizontal?: boolean;
  /** Callback when scrolling */
  onScroll?: (scrollOffset: number) => void;
  /** Initial scroll offset */
  initialOffset?: number;
}

/**
 * A virtualized list component that efficiently renders large lists
 * by only rendering items that are currently visible in the viewport.
 *
 * Uses TanStack Virtual for performance.
 */
export function VirtualList<T>({
  items,
  estimateSize = 48,
  renderItem,
  getItemKey,
  height = "100%",
  overscan = 5,
  className = "",
  innerClassName = "",
  gap = 0,
  emptyState,
  isLoading,
  loadingState,
  horizontal = false,
  onScroll,
  initialOffset = 0,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    horizontal,
    getItemKey: getItemKey
      ? (index) => getItemKey(index, items[index])
      : undefined,
    initialOffset,
    gap,
  });

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (onScroll && parentRef.current) {
      const offset = horizontal
        ? parentRef.current.scrollLeft
        : parentRef.current.scrollTop;
      onScroll(offset);
    }
  }, [onScroll, horizontal]);

  // Loading state
  if (isLoading) {
    return (
      loadingState ?? (
        <div className="flex items-center justify-center h-full p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
            <span className="text-sm opacity-60">Loading...</span>
          </div>
        </div>
      )
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      emptyState ?? (
        <div className="flex items-center justify-center p-8">
          <span className="text-sm opacity-60">No data to display</span>
        </div>
      )
    );
  }

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div
        className={`relative ${innerClassName}`}
        style={{
          [horizontal ? "width" : "height"]: `${totalSize}px`,
          [horizontal ? "height" : "width"]: "100%",
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          const style: React.CSSProperties = {
            position: "absolute",
            top: 0,
            left: 0,
            [horizontal ? "width" : "height"]: `${virtualItem.size}px`,
            [horizontal ? "height" : "width"]: "100%",
            transform: horizontal
              ? `translateX(${virtualItem.start}px)`
              : `translateY(${virtualItem.start}px)`,
          };

          return (
            <div key={virtualItem.key} style={style}>
              {renderItem({
                item,
                index: virtualItem.index,
                virtualItem,
                style,
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Props for the VirtualTable component
 */
export interface VirtualTableProps<T> {
  /** Array of items to render */
  items: T[];
  /** Column definitions */
  columns: VirtualTableColumn<T>[];
  /** Row height in pixels */
  rowHeight?: number;
  /** Header height in pixels */
  headerHeight?: number;
  /** Optional key extractor for rows */
  getRowKey?: (index: number, item: T) => string | number;
  /** Container height */
  height?: string | number;
  /** Overscan count */
  overscan?: number;
  /** Optional className */
  className?: string;
  /** Empty state */
  emptyState?: React.ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** On row click */
  onRowClick?: (item: T, index: number) => void;
  /** Selected row ids (can be a Set<string> or an array of string ids) */
  selectedIds?: Set<string> | string[];
  /** On selection change */
  onSelectionChange?: (id: string, selected: boolean) => void;
  /** Enable selection */
  selectable?: boolean;
  /** When true, calculations for visible counts should exclude overscan-rendered items */
  excludeOverscan?: boolean;
  /** Footer height in pixels reserved outside the scroll area (docked below) */
  footerHeight?: number;
  /** Hide the table header (useful when header is managed externally) */
  hideHeader?: boolean;
}

/**
 * Column definition for VirtualTable
 */
export interface VirtualTableColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Header content — can be a string or any React node (allows icons, components, etc.) */
  header: React.ReactNode;
  /** Width of the column (CSS value) */
  width?: string;
  /** Flex grow value */
  flex?: number;
  /** Cell renderer */
  render: (item: T, index: number) => React.ReactNode;
  /** Header alignment */
  headerAlign?: "left" | "center" | "right";
  /** Cell alignment */
  align?: "left" | "center" | "right";
}

/**
 * A virtualized table component for displaying tabular data efficiently
 */
export function VirtualTable<T>({
  items,
  columns,
  rowHeight = 48,
  headerHeight = 48,
  getRowKey,
  height = "100%",
  overscan = 5,
  className = "",
  emptyState,
  isLoading,
  onRowClick,
  selectedIds,
  onSelectionChange,
  selectable = false,
  // height in pixels reserved for the footer placed outside the scroll area
  footerHeight = 0,
  hideHeader = false,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [measuredFooterHeight, setMeasuredFooterHeight] = useState<number>(0);

  // Visible range and footer visibility state
  const [visibleStart, setVisibleStart] = useState(0);
  const [visibleEnd, setVisibleEnd] = useState(0);
  // Number of actually visible rows (excluding overscan)
  const [visibleCount, setVisibleCount] = useState(0);
  const [showFooter, setShowFooter] = useState(false);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  // Keep virtualizer measurements up to date on resize / container changes.
  // Also measure footer height (when footerRef is present) and update measuredFooterHeight.
  useEffect(() => {
    const el = parentRef.current;
    const fo = footerRef.current;

    const bodyRo =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            try {
              virtualizer.measure();
            } catch {
              // ignore measurement errors
            }
          })
        : null;

    if (el && bodyRo) bodyRo.observe(el);

    let footerRo: ResizeObserver | null = null;
    if (fo && typeof ResizeObserver !== "undefined") {
      footerRo = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const h =
            (entry.contentRect && entry.contentRect.height) ||
            (entry.target && (entry.target as HTMLElement).offsetHeight) ||
            0;
          setMeasuredFooterHeight(Math.round(h));
        }
      });
      footerRo.observe(fo);
      // initial measure
      try {
        const h =
          (fo.getBoundingClientRect && fo.getBoundingClientRect().height) ||
          fo.offsetHeight ||
          0;
        setMeasuredFooterHeight(Math.round(h));
      } catch {
        // ignore
      }
    }

    const onWindowResize = () => {
      try {
        virtualizer.measure();
      } catch {
        // ignore
      }
      // Also re-measure footer on window resize (in case UI scale changes)
      try {
        if (footerRef.current) {
          const h =
            (footerRef.current.getBoundingClientRect &&
              footerRef.current.getBoundingClientRect().height) ||
            footerRef.current.offsetHeight ||
            0;
          setMeasuredFooterHeight(Math.round(h));
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("resize", onWindowResize);

    return () => {
      if (bodyRo) bodyRo.disconnect();
      if (footerRo) footerRo.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, [virtualizer, items.length, rowHeight]);

  // Helper to recalculate visible range and actual visible count (excluding overscan)
  const recalcVisible = useCallback(() => {
    // Ensure virtualizer measurements are up-to-date before computing visible items
    try {
      virtualizer.measure();
    } catch {
      // ignore measurement errors
    }

    const vItems = virtualizer.getVirtualItems();
    const el = parentRef.current;
    if (!vItems || vItems.length === 0) {
      setVisibleStart(0);
      setVisibleCount(0);
      setVisibleEnd(0);
      return;
    }

    // If there's no measured container yet, fallback to first/last virtualized items
    if (!el) {
      const start = vItems[0].index;
      const count = vItems.length;
      setVisibleStart(start);
      setVisibleCount(count);
      // compute visibleEnd deterministically from start + count - 1 to avoid overscan mismatch
      setVisibleEnd(start + Math.max(0, count) - 1);
      return;
    }

    const scrollTop = el.scrollTop;
    const clientHeight = el.clientHeight;

    // Find items that intersect the viewport (exclude overscan items outside the visible viewport)
    const visibleItems = vItems.filter((vi) => {
      const top = vi.start;
      const bottom = vi.start + vi.size;
      return bottom > scrollTop && top < scrollTop + clientHeight;
    });

    if (visibleItems.length === 0) {
      // If none intersect (edge case), fall back to extremes of rendered virtual items
      const start = vItems[0].index;
      setVisibleStart(start);
      setVisibleCount(0);
      // end becomes start - 1 when nothing visible
      setVisibleEnd(start - 1);
      return;
    }

    const minIndex = Math.min(...visibleItems.map((vi) => vi.index));
    const count = visibleItems.length;

    // Set start and count, compute end deterministically to avoid overscan mismatches
    setVisibleStart(minIndex);
    setVisibleCount(count);
    setVisibleEnd(minIndex + Math.max(0, count) - 1);
  }, [virtualizer]);

  // Update visible range whenever virtual items change
  useEffect(() => {
    recalcVisible();
    // Note: intentionally no extensive deps to update on each render when virtual items shift
  });

  // Scroll handler for the table body: update visible range and footer visibility
  const handleBodyScroll = () => {
    const el = parentRef.current;
    if (!el) return;

    // Determine if user scrolled to (or near) the bottom
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 20;
    setShowFooter(atBottom);

    // Recalculate visible range and the actual visible count
    recalcVisible();
  };

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const getAlignClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center justify-center";
      case "right":
        return "text-right justify-end";
      default:
        return "text-left justify-start";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
          <span className="text-sm opacity-60">Loading...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      emptyState ?? (
        <div className={className}>
          {!hideHeader && (
            <div
              className="flex border-b bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10"
              style={{ height: headerHeight }}
            >
              {selectable && (
                <div className="w-10 flex items-center justify-center px-2 shrink-0" />
              )}
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={`flex items-center px-3 font-medium text-xs uppercase tracking-wider opacity-70 ${getAlignClass(
                    col.headerAlign,
                  )}`}
                  style={{
                    width: col.width,
                    flex: col.flex ?? (col.width ? undefined : 1),
                  }}
                >
                  {col.header}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-center p-8">
            <span className="text-sm opacity-60">No data to display</span>
          </div>
        </div>
      )
    );
  }

  return (
    <div
      className={`flex flex-col ${height === "100%" ? "flex-1 h-full" : ""} ${className}`}
      style={height === "100%" ? undefined : { height }}
    >
      {/* Fixed Header */}
      {!hideHeader && (
        <div
          className="flex border-b bg-slate-50 dark:bg-slate-800/50 shrink-0"
          style={{ height: headerHeight }}
        >
          {selectable && (
            <div className="w-10 flex items-center justify-center px-2 shrink-0">
              <input
                type="checkbox"
                className="w-4 h-4 rounded"
                checked={
                  (Array.isArray(selectedIds)
                    ? selectedIds.length === items.length
                    : selectedIds?.size === items.length) && items.length > 0
                }
                onChange={(e) => {
                  if (onSelectionChange) {
                    items.forEach((item, idx) => {
                      const key = getRowKey ? getRowKey(idx, item) : idx;
                      onSelectionChange(String(key), e.target.checked);
                    });
                  }
                }}
              />
            </div>
          )}
          {columns.map((col) => (
            <div
              key={col.key}
              className={`flex items-center px-3 font-medium text-xs uppercase tracking-wider opacity-70 ${getAlignClass(
                col.headerAlign,
              )}`}
              style={{
                width: col.width,
                flex: col.flex ?? (col.width ? undefined : 1),
              }}
            >
              {col.header}
            </div>
          ))}
        </div>
      )}

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        onScroll={handleBodyScroll}
      >
        <div className="relative" style={{ height: totalSize }}>
          {virtualItems.map((virtualItem) => {
            const item = items[virtualItem.index];
            const rowKey = getRowKey
              ? getRowKey(virtualItem.index, item)
              : virtualItem.index;
            const isSelected = Array.isArray(selectedIds)
              ? selectedIds.includes(String(rowKey))
              : selectedIds?.has(String(rowKey));

            return (
              <div
                key={virtualItem.key}
                className={`absolute top-0 left-0 w-full flex border-b transition-colors ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                } ${onRowClick ? "cursor-pointer" : ""}`}
                style={{
                  height: virtualItem.size,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                onClick={() => onRowClick?.(item, virtualItem.index)}
              >
                {selectable && (
                  <div className="w-10 flex items-center justify-center px-2 shrink-0">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSelectionChange?.(String(rowKey), e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className={`flex items-center px-3 truncate ${getAlignClass(
                      col.align,
                    )}`}
                    style={{
                      width: col.width,
                      flex: col.flex ?? (col.width ? undefined : 1),
                    }}
                  >
                    {col.render(item, virtualItem.index)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer docked below the scrollable area (non-sticky) */}
      <div
        ref={footerRef}
        className="px-3 py-2 border-t bg-white flex items-center justify-between text-sm shrink-0"
      >
        <div className="text-slate-700">
          Showing {visibleStart + 1}
          {visibleEnd >= visibleStart ? `–${visibleEnd + 1}` : ""} of{" "}
          {items.length} transactions
          <span className="ml-2 text-xs text-slate-500">
            (visible: {visibleCount})
          </span>
        </div>

        <div className="flex items-center gap-3">
          {showFooter ? (
            <span className="px-2 py-1 rounded text-xs font-medium text-blue-700 bg-blue-50">
              Scrolled to bottom
            </span>
          ) : (
            <span className="text-xs text-slate-500">Scroll to see more</span>
          )}

          <button
            type="button"
            className="ml-2 px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
            onClick={() => {
              const el = parentRef.current;
              if (el) {
                el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                // update footer state proactively
                setShowFooter(true);
              }
            }}
          >
            Jump to bottom
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Re-export helpers from @tanstack/react-virtual for external usage
 */
export { useVirtualizer } from "@tanstack/react-virtual";
export type { VirtualItem } from "@tanstack/react-virtual";
