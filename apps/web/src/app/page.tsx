import { redirect } from "next/navigation";

/** The bare address has no page of its own. */
export default function HomePage() {
  redirect("/sign-in");
}
