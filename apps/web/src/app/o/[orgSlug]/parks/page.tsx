"use client";

import { useParams } from "next/navigation";
import { hu } from "@/i18n/hu";
import { useParks } from "@/lib/parks";

export default function ParksPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const parks = useParks(orgSlug);

  return (
    <>
      <h1 className="type-title">{hu.parks.title}</h1>
      {parks.data?.length === 0 ? <p className="mt-4 type-lead">{hu.parks.empty}</p> : null}
      <ul className="mt-6 flex flex-col gap-2">
        {parks.data?.map((park) => (
          <li key={park.id}>{park.name}</li>
        ))}
      </ul>
    </>
  );
}
