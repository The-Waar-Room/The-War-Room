"use client";

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
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <option value="all">All Apps</option>
      {apps.map((app) => (
        <option key={app.id} value={app.id}>
          {app.label}
        </option>
      ))}
    </select>
  );
}
