import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LandingPage } from "./LandingPage";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // If already authenticated, go straight to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
