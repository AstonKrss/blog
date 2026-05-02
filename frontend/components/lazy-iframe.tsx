"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface LazyIframeProps {
  src: string;
  title: string;
  className?: string;
  style?: React.CSSProperties;
}

export function LazyIframe({ src, title, className, style }: LazyIframeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative ${className || ""}`} style={style}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a1a0f]/80 rounded-b-2xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            <span className="text-xs text-green-500/60 font-mono">加载终端中...</span>
          </div>
        </div>
      )}
      {loaded && (
        <iframe
          src={src}
          title={title}
          className="w-full h-full border-0"
          style={{ outline: "none" }}
          sandbox="allow-same-origin allow-scripts"
        />
      )}
    </div>
  );
}
