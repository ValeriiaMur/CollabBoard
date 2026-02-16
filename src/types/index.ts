import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
  }
}

// Liveblocks presence types
export type Presence = {
  cursor: { x: number; y: number } | null;
  name: string;
  color: string;
};

export type UserMeta = {
  id: string;
  info: {
    name: string;
    email: string;
    image: string;
    color: string;
  };
};
