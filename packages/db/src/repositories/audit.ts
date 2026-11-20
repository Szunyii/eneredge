import type { Transaction } from "../client.ts";
import { auditLog } from "../schema/index.ts";

export type AuditEntry = {
  organizationId: string | null;
  actorUserId: string | null;
  /** `<thing>.<verb>`, e.g. park.create */
  action: string;
  targetType: string;
  targetId: string;
  detail?: Record<string, unknown>;
};

/**
 * The audit log is written inside the transaction of the change it records,
 * so a change and its record exist together or not at all.
 */
export const audit = {
  async record(transaction: Transaction, entry: AuditEntry): Promise<void> {
    await transaction.insert(auditLog).values({ ...entry, detail: entry.detail ?? {} });
  },
};
