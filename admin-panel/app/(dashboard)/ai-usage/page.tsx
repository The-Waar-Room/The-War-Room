export default function AiUsagePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold md:text-2xl">AI Usage</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          Today totals: messages, tokens, USD, INR
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          This month totals + projection
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        Cost/day chart, messages/app bar chart, and top users table go here.
      </div>
    </section>
  );
}
