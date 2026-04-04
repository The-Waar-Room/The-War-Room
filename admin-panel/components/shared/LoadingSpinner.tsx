export default function LoadingSpinner() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 w-1/3 rounded bg-slate-200" />
      <div className="h-4 w-full rounded bg-slate-200" />
      <div className="h-4 w-2/3 rounded bg-slate-200" />
    </div>
  );
}
