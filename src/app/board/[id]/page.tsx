import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserColor } from "@/lib/userColors";
import { BoardRoom } from "./BoardRoom";

interface BoardPageProps {
  params: { id: string };
}

export default async function BoardPage({ params }: BoardPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/");
  }

  const userName = session.user.name ?? "Anonymous";
  const userColor = getUserColor(session.user.id);
  const userImage = session.user.image ?? "";

  // PartyKit host: use env var in production, localhost in dev
  const partyHost =
    process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";

  return (
    <BoardRoom
      boardId={params.id}
      userName={userName}
      userColor={userColor}
      userImage={userImage}
      partyHost={partyHost}
    />
  );
}
