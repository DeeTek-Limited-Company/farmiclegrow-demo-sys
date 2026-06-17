import type { ReactNode } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon?: ReactNode;
  href?: string;
  tone?: "default" | "blue" | "emerald" | "amber" | "slate";
};

const toneStyles: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "bg-[#FFF9EF] text-[#16311F] ring-1 ring-[#E9DFC8]",
  blue: "bg-[#F3FAF2] text-[#17371F] ring-1 ring-[#D7E8D6]",
  emerald: "bg-emerald-50/90 text-emerald-950 ring-1 ring-emerald-100",
  amber: "bg-[#FFF4D6] text-[#5C3B00] ring-1 ring-[#F2D27A]",
  slate: "bg-[#F6F1E7] text-[#2A332C] ring-1 ring-[#E4D8C4]",
};

export function MetricCard({
  title,
  value,
  description,
  icon,
  href,
  tone = "default",
}: MetricCardProps) {
  const body = (
    <Card
      className={cn(
        "overflow-hidden rounded-[2rem] border-0 shadow-xl shadow-[#B9A46A]/15 transition-all duration-300",
        href && "group-hover:-translate-y-0.5 group-hover:shadow-2xl group-hover:shadow-[#B9A46A]/20",
        toneStyles[tone],
      )}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">{title}</p>
            <p className="text-3xl font-black tracking-tight sm:text-4xl">{value}</p>
            <p className="text-sm font-medium text-[#5F6F63]">{description}</p>
          </div>
          {icon ? (
            <div className="rounded-2xl border border-primary/10 bg-white/75 p-3 shadow-sm backdrop-blur-sm">
              {icon}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) {
    return body;
  }

  return (
    <Link href={href} className="group block transition-transform focus-visible:outline-none">
      {body}
    </Link>
  );
}
