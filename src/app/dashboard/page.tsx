import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/");
  }

  const snapshot = await db
    .collection("boards")
    .where("ownerId", "==", session.user.id)
    .orderBy("updatedAt", "desc")
    .get();

  const boards = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name as string,
      updatedAt: data.updatedAt?.toDate?.().toISOString() ?? new Date().toISOString(),
    };
  });

  return (
    <DashboardClient
      boards={boards}
      userName={session.user.name ?? "User"}
      userImage={session.user.image ?? ""}
    />
  );
}
