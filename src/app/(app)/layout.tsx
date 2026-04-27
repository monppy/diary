import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <nav className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/entries" className="font-semibold text-lg tracking-tight">
            📔 日記
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/search" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              検索
            </Link>
            <Link href="/new" className={cn(buttonVariants({ size: "sm" }))}>
              + 新規
            </Link>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit">
                ログアウト
              </Button>
            </form>
          </div>
        </nav>
      </header>
      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        {children}
      </main>
    </div>
  );
}
