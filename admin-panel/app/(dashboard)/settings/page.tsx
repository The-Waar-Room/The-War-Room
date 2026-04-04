export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold md:text-2xl">Settings</h1>
      <div className="grid gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          Plan Limits section
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          System Prompts section
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          Kill Switch section
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          Team Access section
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          API Keys section
        </div>
      </div>
    </section>
  );
}
