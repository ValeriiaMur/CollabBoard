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

    // Convert collaborators map to sorted array
    const collaboratorsMap = data.collaborators || {};
    const collaborators = Object.entries(collaboratorsMap)
      .map(([uid, collab]: [string, any]) => ({
        userId: uid,
        userName: collab.userName as string,
        userImage: (collab.userImage as string) || null,
        editedAt: collab.editedAt?.toDate?.().toISOString() ?? null,
      }))
      .sort(
        (a, b) =>
          new Date(b.editedAt ?? 0).getTime() -
          new Date(a.editedAt ?? 0).getTime()
      );

    return {
      id: doc.id,
      name: data.name as string,
      updatedAt: data.updatedAt?.toDate?.().toISOString() ?? new Date().toISOString(),
      thumbnailDataUrl: (data.thumbnailDataUrl as string) || null,
      collaborators,
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
