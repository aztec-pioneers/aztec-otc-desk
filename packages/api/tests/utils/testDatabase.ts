import { SQLiteDatabase } from "../../src/db/sqlite";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

/**
 * Test database utility for creating and cleaning up temporary databases
 */
export class TestDatabase {
  private database: SQLiteDatabase;
  private filename: string;

  constructor(testName: string) {
    this.filename = `test_${testName}_${Date.now()}.sqlite`;
    this.database = new SQLiteDatabase(this.filename);
  }

  /**
   * Initialize the test database
   */
  setup(): SQLiteDatabase {
    this.database.initialize();
    return this.database;
  }

  /**
   * Clean up the test database
   */
  async cleanup(): Promise<void> {
    try {
      this.database.close();
      if (existsSync(this.filename)) {
        await unlink(this.filename);
      }
    } catch (error) {
      console.warn(`Failed to cleanup test database ${this.filename}:`, error);
    }
  }

  /**
   * Get the database instance
   */
  getDatabase(): SQLiteDatabase {
    return this.database;
  }

  /**
   * Get the filename
   */
  getFilename(): string {
    return this.filename;
  }
}
