"use client";

import { useState, useEffect } from "react";
import { List, ChevronRight, ChevronDown } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
  children?: TocItem[];
}

interface TableOfContentsProps {
  items: TocItem[];
  className?: string;
}

export function TableOfContents({ items, className = "" }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Track scroll position to highlight active section
  useEffect(() => {
    if (typeof window === "undefined" || items.length === 0) return;

    const headingElements = items.flatMap((item) => [
      document.getElementById(item.id),
      ...(item.children?.map((child) => document.getElementById(child.id)) || []),
    ]).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-80px 0px -80% 0px",
        threshold: 0,
      }
    );

    headingElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [items]);

  // Toggle expand/collapse for mobile
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100; // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });

      // Update URL hash without scrolling
      history.pushState(null, "", `#${id}`);
      setActiveId(id);
    }
  };

  if (!items || items.length === 0) {
    return null;
  }

  const renderItem = (item: TocItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = activeId === item.id;
    const isExpanded = expandedIds.has(item.id);

    return (
      <li key={item.id} className={isChild ? "ml-3" : ""}>
        <div
          className={`
            group flex items-center gap-1 py-1.5 text-sm cursor-pointer
            transition-all duration-200
            ${isChild ? "pl-2" : ""}
            ${item.level === 1 ? "font-medium" : "font-normal"}
            ${isActive
              ? "text-rose-600 dark:text-rose-400 font-medium"
              : "text-muted-foreground hover:text-foreground"
            }
          `}
        >
          {/* Expand/Collapse button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.preventDefault();
                toggleExpand(item.id);
              }}
              className="p-0.5 hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}

          {/* Heading link */}
          <a
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault();
              scrollToHeading(item.id);
            }}
            className={`
              flex-1 hover:underline underline-offset-2
              ${isActive ? "text-rose-600 dark:text-rose-400" : ""}
              line-clamp-2
            `}
            style={{
              paddingLeft: hasChildren ? "0" : item.level > 1 ? `${(item.level - 1) * 0.75}rem` : "0",
            }}
          >
            {item.text}
          </a>

          {/* Active indicator */}
          {isActive && (
            <span className="absolute left-0 w-0.5 h-5 bg-rose-600 dark:bg-rose-400 rounded-r" />
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <ul className="mt-1 border-l border-border/50">
            {item.children!.map((child) => renderItem(child, true))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <nav className={`relative ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <List className="h-4 w-4 text-rose-500" />
        <span className="text-sm font-medium">目录</span>
      </div>

      {/* TOC List */}
      <ul className="relative space-y-1">
        {items.map((item) => renderItem(item))}
      </ul>
    </nav>
  );
}

// Skeleton loader
export function TableOfContentsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 w-12 bg-muted rounded" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="h-4 bg-muted rounded"
              style={{ width: `${Math.random() * 40 + 60}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
