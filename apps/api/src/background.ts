/**
 * Starts work that the request does not wait for, so the answer takes the same
 * time whatever the work turns out to be. A failure is logged with what was
 * being done; it must never reach the caller or take the process down.
 */
export function runInBackground(description: string, work: () => Promise<void>): void {
  Promise.resolve()
    .then(work)
    .catch((error: unknown) => {
      console.error(`${description} failed:`, error);
    });
}
