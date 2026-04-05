import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  icon?: LucideIcon;
  iconColor?: string;
}

export default function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  iconColor = "text-muted-foreground",
}: StatCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
            {trend ? (
              <p className="mt-1 text-xs text-muted-foreground">{trend}</p>
            ) : null}
          </div>
          {Icon ? (
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg bg-muted",
                iconColor
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
