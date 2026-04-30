"use client";

import { useSearchParams } from "next/navigation";
import Form from "next/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SearchForm() {
  const searchParams = useSearchParams();

  return (
    <Form action="/search" className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="q">キーワード</Label>
        <Input
          id="q"
          name="q"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="本文で検索…"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="dateFrom">開始日</Label>
          <Input
            id="dateFrom"
            name="dateFrom"
            type="date"
            defaultValue={searchParams.get("dateFrom") ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dateTo">終了日</Label>
          <Input
            id="dateTo"
            name="dateTo"
            type="date"
            defaultValue={searchParams.get("dateTo") ?? ""}
          />
        </div>
      </div>
      <Button type="submit">検索する</Button>
    </Form>
  );
}
