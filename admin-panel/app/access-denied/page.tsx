export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your email is not authorized for this admin panel.
        </p>
      </section>
    </main>
  );
}
