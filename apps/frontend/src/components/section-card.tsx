import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SectionCardProps = {
  title: string;
  /** A sentence under the title that says what this part is for. */
  lead?: ReactNode;
  children: ReactNode;
};

/** One part of a page, on its own sheet: a title and what belongs under it. */
export function SectionCard({ title, lead, children }: SectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {lead ? <CardDescription>{lead}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
