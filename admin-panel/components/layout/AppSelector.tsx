"use client";

import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppSelectorProps {
  value: string;
  onChange: (value: string) => void;
  apps: Array<{ id: string; label: string }>;
}

export default function AppSelector({
  value,
  onChange,
  apps,
}: AppSelectorProps) {
  const selected = apps.find((a) => a.id === value);
  const label = selected?.label ?? "All Apps";

  const options = [{ id: "all", label: "All Apps" }, ...apps];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between gap-2 text-sm font-normal"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {options.map((app) => (
          <DropdownMenuItem
            key={app.id}
            onClick={() => onChange(app.id)}
            className="justify-between"
          >
            {app.label}
            {value === app.id && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
