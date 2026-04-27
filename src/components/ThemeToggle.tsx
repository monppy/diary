"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEMES = [
  { value: "light", label: "ライト", Icon: Sun },
  { value: "dark",  label: "ダーク",  Icon: Moon },
  { value: "system", label: "システム", Icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // ハイドレーション不一致を防ぐためマウント後にレンダリング
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="size-7" />;

  const current = THEMES.find((t) => t.value === theme) ?? THEMES[2];
  const { Icon } = current;

  function cycle() {
    const idx = THEMES.findIndex((t) => t.value === theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next.value);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      title={`テーマ: ${current.label} (クリックで切替)`}
      className="px-2"
    >
      <Icon className="size-4" />
      <span className="sr-only">{current.label}</span>
    </Button>
  );
}
