"use client";

import { useEffect, useState } from "react";

/** Avoid SSR/client locale mismatches for formatted dates. */
export function ClientDateTime({
  value,
  className,
  options,
}: {
  value?: string | Date | null;
  className?: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const [text, setText] = useState("—");

  useEffect(() => {
    if (!value) {
      setText("—");
      return;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      setText("—");
      return;
    }
    setText(
      date.toLocaleString(undefined, options ?? { dateStyle: "medium", timeStyle: "short" }),
    );
  }, [value, options]);

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
