import UserDetail from "@/components/users/UserDetail";

export default function UserDetailPage({
  params,
}: {
  params: { uid: string };
}) {
  return <UserDetail uid={params.uid} />;
}
