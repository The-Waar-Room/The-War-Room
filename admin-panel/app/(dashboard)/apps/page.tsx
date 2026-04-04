export default function AppsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold md:text-2xl">Apps</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">App Name</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">User Count</th>
              <th className="px-4 py-3">Messages Today</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-4 py-3">Study Scroller</td>
              <td className="px-4 py-3">Android</td>
              <td className="px-4 py-3">Active</td>
              <td className="px-4 py-3">-</td>
              <td className="px-4 py-3">-</td>
              <td className="px-4 py-3">Add/View/Toggle (to wire)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
