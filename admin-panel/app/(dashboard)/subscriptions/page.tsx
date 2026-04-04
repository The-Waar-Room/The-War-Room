export default function SubscriptionsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold md:text-2xl">Subscriptions</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          Active: -
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          MRR: -
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          Expiring This Week: -
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        Subscriptions table and plan charts will render here.
      </div>
    </section>
  );
}
