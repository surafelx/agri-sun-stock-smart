// Kept for type references only. All data access goes through src/lib/api.ts.
export type User = { id: string; email: string };
export type Session = { user: User };
