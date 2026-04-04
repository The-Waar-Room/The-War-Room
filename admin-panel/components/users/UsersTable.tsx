interface UserRow {
  uid: string;
  email: string;
  app: string;
  plan: string;
  messagesToday: number;
  joinedDate: string;
  lastSeen: string;
  status: string;
}

export default function UsersTable({ rows }: { rows: UserRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[900px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">App</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Messages Today</th>
            <th className="px-4 py-3">Joined</th>
            <th className="px-4 py-3">Last Seen</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.uid} className="border-t border-slate-100">
              <td className="px-4 py-3">{row.email}</td>
              <td className="px-4 py-3">{row.app}</td>
              <td className="px-4 py-3">{row.plan}</td>
              <td className="px-4 py-3">{row.messagesToday}</td>
              <td className="px-4 py-3">{row.joinedDate}</td>
              <td className="px-4 py-3">{row.lastSeen}</td>
              <td className="px-4 py-3">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
