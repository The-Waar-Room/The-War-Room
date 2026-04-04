import UsersTable from "@/components/users/UsersTable";

export default function UsersPage() {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold md:text-2xl">Users</h1>
        <input
          placeholder="Search by email or UID"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      <UsersTable
        rows={[
          {
            uid: "sample-uid",
            email: "user@example.com",
            app: "descroll",
            plan: "monthly",
            messagesToday: 4,
            joinedDate: "2026-03-29",
            lastSeen: "2026-04-04",
            status: "active",
          },
        ]}
      />
    </section>
  );
}
