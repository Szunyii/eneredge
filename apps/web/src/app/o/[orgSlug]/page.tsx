import { redirect } from "next/navigation";

/** A company's bare address leads to its parks. */
export default async function OrganizationHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/o/${orgSlug}/parks`);
}
