import { Database } from "bun:sqlite";
import type { Order } from "../types/api";

/**
 * SQLite Database instance
 */
export const db = new Database("orders.sqlite");

/**
 * Initialize database schema
 */
export function initializeDatabase() {
  // Create orders table
  db.exec(`
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
export function escrowAddressExists(escrowAddress: string): boolean {
  const stmt = db.prepare("SELECT COUNT(*) as count FROM orders WHERE escrowAddress = ?");
  const result = stmt.get(escrowAddress) as { count: number };
  return result.count > 0;
}

/**
 * Insert a new order into the database
 */
export function insertOrder(order: Order): Order {
  // Check if escrow address already exists
  if (escrowAddressExists(order.escrowAddress)) {
    throw new Error(`Order with escrow address ${order.escrowAddress} already exists`);
  }
  
  const stmt = db.prepare(`
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
export function getOrderById(orderId: string): Order | null {
  const stmt = db.prepare("SELECT * FROM orders WHERE orderId = ?");
  const row = stmt.get(orderId) as any;
  
  if (!row) return null;
  
  return {
    orderId: row.orderId,
    escrowAddress: row.escrowAddress,
    sellTokenAddress: row.sellTokenAddress,
    sellTokenAmount: BigInt(row.sellTokenAmount), // Convert string back to BigInt
    buyTokenAddress: row.buyTokenAddress,
    buyTokenAmount: BigInt(row.buyTokenAmount)    // Convert string back to BigInt
  };
}

/**
 * Get order by escrow address
 */
export function getOrderByEscrowAddress(escrowAddress: string): Order | null {
  const stmt = db.prepare("SELECT * FROM orders WHERE escrowAddress = ?");
  const row = stmt.get(escrowAddress) as any;
  
  if (!row) return null;
  
  return {
    orderId: row.orderId,
    escrowAddress: row.escrowAddress,
    sellTokenAddress: row.sellTokenAddress,
    sellTokenAmount: BigInt(row.sellTokenAmount), // Convert string back to BigInt
    buyTokenAddress: row.buyTokenAddress,
    buyTokenAmount: BigInt(row.buyTokenAmount)    // Convert string back to BigInt
  };
}

/**
 * Get all orders
 */
export function getAllOrders(): Order[] {
  const stmt = db.prepare("SELECT * FROM orders ORDER BY createdAt DESC");
  const rows = stmt.all() as any[];
  
  return rows.map(row => ({
    orderId: row.orderId,
    escrowAddress: row.escrowAddress,
    sellTokenAddress: row.sellTokenAddress,
    sellTokenAmount: BigInt(row.sellTokenAmount),
    buyTokenAddress: row.buyTokenAddress,
    buyTokenAmount: BigInt(row.buyTokenAmount)
  }));
}
