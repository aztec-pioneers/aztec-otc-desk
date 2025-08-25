import type { Order } from "../types/api";

/**
 * Database interface for order operations
 * This interface can be implemented by different database providers (SQLite, PostgreSQL, etc.)
 */
export interface IDatabase {
  /**
   * Initialize the database schema
   */
  initialize(): void;

  /**
   * Check if an escrow address already exists
   */
  escrowAddressExists(escrowAddress: string): boolean;

  /**
   * Insert a new order into the database
   * @throws Error if escrow address already exists
   */
  insertOrder(order: Order): Order;

  /**
   * Get order by ID
   */
  getOrderById(orderId: string): Order | null;

  /**
   * Get order by escrow address
   */
  getOrderByEscrowAddress(escrowAddress: string): Order | null;

  /**
   * Get all orders
   */
  getAllOrders(): Order[];

  /**
   * Close database connection (if applicable)
   */
  close(): void;
}
