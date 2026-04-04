interface UserDetailProps {
  uid: string;
}

export default function UserDetail({ uid }: UserDetailProps) {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">User Detail</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">UID</p>
        <p className="font-medium text-slate-900">{uid}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-medium text-slate-900">
            Subscription History
          </h2>
          <p className="text-sm text-slate-500">
            Placeholder for subscription timeline.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-medium text-slate-900">Chat History</h2>
          <p className="text-sm text-slate-500">
            Last 50 messages will render here.
          </p>
        </div>
      </div>
    </section>
  );
}
