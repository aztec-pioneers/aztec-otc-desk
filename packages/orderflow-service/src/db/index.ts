/**
 * Database module exports
 */

import { SQLiteDatabase } from "./sqlite";

export type { IDatabase } from "./interface";
export { SQLiteDatabase } from "./sqlite";

// Create and export a default database instance
export const database = new SQLiteDatabase();
