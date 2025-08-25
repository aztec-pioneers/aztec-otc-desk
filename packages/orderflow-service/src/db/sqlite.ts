import { Database } from "bun:sqlite";
import type { Order } from "../types/api";
import type { IDatabase } from "./interface";

/**
 * SQLite implementation of the Database interface
 */
export class SQLiteDatabase implements IDatabase {
  private db: Database;

  constructor(filename: string = "orders.sqlite") {
    this.db = new Database(filename);
  }

  /**
   * Initialize database schema
   */
  initialize(): void {
    // Create orders table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        orderId TEXT PRIMARY KEY,
        escrowAddress TEXT NOT NULL UNIQUE,
        sellTokenAddress TEXT NOT NULL,
        sellTokenAmount TEXT NOT NULL,
        buyTokenAddress TEXT NOT NULL,
        buyTokenAmount TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Check if an escrow address already exists
   */
  escrowAddressExists(escrowAddress: string): boolean {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM orders WHERE escrowAddress = ?");
    const result = stmt.get(escrowAddress) as { count: number };
    return result.count > 0;
  }

  /**
   * Insert a new order into the database
   */
  insertOrder(order: Order): Order {
    // Check if escrow address already exists
    if (this.escrowAddressExists(order.escrowAddress)) {
      throw new Error(`Order with escrow address ${order.escrowAddress} already exists`);
    }
    
    const stmt = this.db.prepare(`
      INSERT INTO orders (orderId, escrowAddress, sellTokenAddress, sellTokenAmount, buyTokenAddress, buyTokenAmount)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    try {
      stmt.run(
        order.orderId,
        order.escrowAddress,
        order.sellTokenAddress,
        order.sellTokenAmount.toString(), // Convert BigInt to string for storage
        order.buyTokenAddress,
        order.buyTokenAmount.toString()   // Convert BigInt to string for storage
      );
      
      return order;
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`Order with escrow address ${order.escrowAddress} already exists`);
      }
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  getOrderById(orderId: string): Order | null {
    const stmt = this.db.prepare("SELECT * FROM orders WHERE orderId = ?");
    const row = stmt.get(orderId) as any;
    
    if (!row) return null;
    
    return this.mapRowToOrder(row);
  }

  /**
   * Get order by escrow address
   */
  getOrderByEscrowAddress(escrowAddress: string): Order | null {
    const stmt = this.db.prepare("SELECT * FROM orders WHERE escrowAddress = ?");
    const row = stmt.get(escrowAddress) as any;
    
    if (!row) return null;
    
    return this.mapRowToOrder(row);
  }

  /**
   * Get all orders
   */
  getAllOrders(): Order[] {
    const stmt = this.db.prepare("SELECT * FROM orders ORDER BY createdAt DESC");
    const rows = stmt.all() as any[];
    
    return rows.map(row => this.mapRowToOrder(row));
  }

  /**
   * Get orders by sell token address
   */
  getOrdersBySellToken(sellTokenAddress: string): Order[] {
    const stmt = this.db.prepare("SELECT * FROM orders WHERE sellTokenAddress = ? ORDER BY createdAt DESC");
    const rows = stmt.all(sellTokenAddress) as any[];
    
    return rows.map(row => this.mapRowToOrder(row));
  }

  /**
   * Get orders by buy token address
   */
  getOrdersByBuyToken(buyTokenAddress: string): Order[] {
    const stmt = this.db.prepare("SELECT * FROM orders WHERE buyTokenAddress = ? ORDER BY createdAt DESC");
    const rows = stmt.all(buyTokenAddress) as any[];
    
    return rows.map(row => this.mapRowToOrder(row));
  }

  /**
   * Get orders with flexible filtering
   */
  getOrdersWithFilters(filters: {
    escrowAddress?: string;
    sellTokenAddress?: string;
    buyTokenAddress?: string;
  }): Order[] {
    let query = "SELECT * FROM orders WHERE 1=1";
    const params: string[] = [];

    if (filters.escrowAddress) {
      query += " AND escrowAddress = ?";
      params.push(filters.escrowAddress);
    }

    if (filters.sellTokenAddress) {
      query += " AND sellTokenAddress = ?";
      params.push(filters.sellTokenAddress);
    }

    if (filters.buyTokenAddress) {
      query += " AND buyTokenAddress = ?";
      params.push(filters.buyTokenAddress);
    }

    query += " ORDER BY createdAt DESC";

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => this.mapRowToOrder(row));
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Helper method to map database row to Order object
   */
  private mapRowToOrder(row: any): Order {
    return {
      orderId: row.orderId,
      escrowAddress: row.escrowAddress,
      sellTokenAddress: row.sellTokenAddress,
      sellTokenAmount: BigInt(row.sellTokenAmount), // Convert string back to BigInt
      buyTokenAddress: row.buyTokenAddress,
      buyTokenAmount: BigInt(row.buyTokenAmount)    // Convert string back to BigInt
    };
  }
}
