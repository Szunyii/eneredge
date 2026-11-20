import { Button } from "@/components/ui/button";
import { hu } from "@/i18n/hu";

/** Shown in place of data that could not be loaded, with a way to try again. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-4">
      <p className="type-lead">{hu.errors.internal}</p>
      <Button variant="secondary" onClick={onRetry}>
        {hu.common.retry}
      </Button>
    </div>
  );
}
