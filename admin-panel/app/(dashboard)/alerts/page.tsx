export default function AlertsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold md:text-2xl">Alerts</h1>
      <ul className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <li>User hit rate limit 10+ times today</li>
        <li>Daily AI cost exceeded INR 500</li>
        <li>New subscription purchased</li>
        <li>Subscription expired</li>
      </ul>
    </section>
  );
}
