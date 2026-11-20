import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  /** A sentence under the title. */
  lead?: ReactNode;
  /** Buttons that act on the page as a whole, shown beside the title. */
  actions?: ReactNode;
};

/** The top of a page inside the app: its name, and what can be done with it. */
export function PageHeader({ title, lead, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="type-title">{title}</h1>
        {lead ? <p className="mt-2 type-lead">{lead}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
