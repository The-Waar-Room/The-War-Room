import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: "owner" | "admin" | "viewer" | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "owner" | "admin" | "viewer" | null;
  }
}
