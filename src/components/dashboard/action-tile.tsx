import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ActionTileProps = {
  title: string;
  description: string;
  href: string;
  icon?: ReactNode;
  eyebrow?: string;
};

export function ActionTile({ title, description, href, icon, eyebrow }: ActionTileProps) {
  return (
    <Link href={href} className="group block transition-transform focus-visible:outline-none">
      <Card className="h-full overflow-hidden rounded-[2rem] border border-primary/10 bg-[#FFFDF6] shadow-xl shadow-[#B9A46A]/15 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-2xl group-hover:shadow-[#B9A46A]/20">
        <CardHeader className="space-y-4">
          {eyebrow ? (
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">{eyebrow}</p>
          ) : null}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-xl font-black tracking-tight text-[#16311F]">{title}</CardTitle>
              <CardDescription className="text-sm font-medium text-[#5F6F63]">{description}</CardDescription>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-3 text-primary shadow-sm">
              {icon ?? <ArrowUpRight className="h-5 w-5" />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="inline-flex items-center gap-2 text-sm font-black text-primary">
            Open
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
