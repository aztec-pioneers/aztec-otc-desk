import type { Order, OTCRequest } from "../types/api";

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
   * Match an OTC buy and sell order by looking for overlapping price ranges
   * @param orderRequest - the OTC order request containing token addresses and price/size ranges
   * @return An order that matches the criteria, or null if none found
   */
  getOrderByRange(orderRequest: OTCRequest): Order | null;

  /**
   * Removes an order once it has been fulfilled
   * @NOTE: needs authentication mechanism - probably checking for existence of nullifier
   * @NOTE: should be able to either use escrow address or order id to close
   * 
   * @param orderId - the order ID to delete
   */
  closeOrder(orderId: string): boolean;

  /**
   * Get orders by sell token address
   */
  getOrdersBySellToken(sellTokenAddress: string): Order[];

  /**
   * Get orders by buy token address
   */
  getOrdersByBuyToken(buyTokenAddress: string): Order[];

  /**
   * Get orders with flexible filtering
   */
  getOrdersWithFilters(filters: {
    escrowAddress?: string;
    sellTokenAddress?: string;
    buyTokenAddress?: string;
  }): Order[];

  /**
   * Close database connection (if applicable)
   */
  close(): void;
}
