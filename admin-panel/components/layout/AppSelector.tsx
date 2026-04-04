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
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
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
