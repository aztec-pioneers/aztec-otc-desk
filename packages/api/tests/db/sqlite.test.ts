import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { TestDatabase } from "../utils/testDatabase";
import { createMockOrder, MOCK_ADDRESSES, MOCK_AMOUNTS } from "../utils/mockData";
import type { SQLiteDatabase } from "../../src/db/sqlite";

describe("SQLiteDatabase", () => {
  let testDb: TestDatabase;
  let database: SQLiteDatabase;

  beforeEach(() => {
    testDb = new TestDatabase("sqlite");
    database = testDb.setup();
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe("Order Creation", () => {
    test("should create an order successfully", () => {
      const mockOrder = createMockOrder();
      
      const result = database.insertOrder(mockOrder);
      
      expect(result).toEqual(mockOrder);
    });

    test("should prevent duplicate escrow addresses", () => {
      const order1 = createMockOrder({ escrowAddress: MOCK_ADDRESSES.escrow1 });
      const order2 = createMockOrder({ escrowAddress: MOCK_ADDRESSES.escrow1 });
      
      // First order should succeed
      database.insertOrder(order1);
      
      // Second order with same escrow should fail
      expect(() => database.insertOrder(order2)).toThrow(
        "Order with escrow address " + MOCK_ADDRESSES.escrow1 + " already exists"
      );
    });

    test("should allow orders with different escrow addresses", () => {
      const order1 = createMockOrder({ escrowAddress: MOCK_ADDRESSES.escrow1 });
      const order2 = createMockOrder({ escrowAddress: MOCK_ADDRESSES.escrow2 });
      
      expect(() => {
        database.insertOrder(order1);
        database.insertOrder(order2);
      }).not.toThrow();
    });

    test("should handle BigInt amounts correctly", () => {
      const order = createMockOrder({
        sellTokenAmount: MOCK_AMOUNTS.huge,
        buyTokenAmount: MOCK_AMOUNTS.large
      });
      
      const result = database.insertOrder(order);
      
      expect(result.sellTokenAmount).toBe(MOCK_AMOUNTS.huge);
      expect(result.buyTokenAmount).toBe(MOCK_AMOUNTS.large);
    });
  });

  describe("Order Retrieval", () => {
    test("should retrieve order by ID", () => {
      const mockOrder = createMockOrder();
      database.insertOrder(mockOrder);
      
      const result = database.getOrderById(mockOrder.orderId);
      
      expect(result).toEqual(mockOrder);
    });

    test("should return null for non-existent order ID", () => {
      const result = database.getOrderById("non-existent-id");
      
      expect(result).toBeNull();
    });

    test("should retrieve order by escrow address", () => {
      const mockOrder = createMockOrder({ escrowAddress: MOCK_ADDRESSES.escrow1 });
      database.insertOrder(mockOrder);
      
      const result = database.getOrderByEscrowAddress(MOCK_ADDRESSES.escrow1);
      
      expect(result).toEqual(mockOrder);
    });

    test("should return null for non-existent escrow address", () => {
      const result = database.getOrderByEscrowAddress("non-existent-address");
      
      expect(result).toBeNull();
    });

    test("should retrieve all orders", () => {
      const order1 = createMockOrder({ escrowAddress: MOCK_ADDRESSES.escrow1 });
      const order2 = createMockOrder({ escrowAddress: MOCK_ADDRESSES.escrow2 });
      
      database.insertOrder(order1);
      database.insertOrder(order2);
      
      const results = database.getAllOrders();
      
      expect(results).toHaveLength(2);
      expect(results).toContainEqual(order1);
      expect(results).toContainEqual(order2);
    });

    test("should return empty array when no orders exist", () => {
      const results = database.getAllOrders();
      
      expect(results).toEqual([]);
    });
  });

  describe("Order Filtering", () => {
    beforeEach(() => {
      // Create test orders
      const orders = [
        createMockOrder({
          escrowAddress: MOCK_ADDRESSES.escrow1,
          sellTokenAddress: MOCK_ADDRESSES.tokenA,
          buyTokenAddress: MOCK_ADDRESSES.tokenB,
        }),
        createMockOrder({
          escrowAddress: MOCK_ADDRESSES.escrow2,
          sellTokenAddress: MOCK_ADDRESSES.tokenA,
          buyTokenAddress: MOCK_ADDRESSES.tokenC,
        }),
        createMockOrder({
          escrowAddress: MOCK_ADDRESSES.escrow3,
          sellTokenAddress: MOCK_ADDRESSES.tokenB,
          buyTokenAddress: MOCK_ADDRESSES.tokenC,
        }),
      ];
      
      orders.forEach(order => database.insertOrder(order));
    });

    test("should filter by sell token address", () => {
      const results = database.getOrdersBySellToken(MOCK_ADDRESSES.tokenA);
      
      expect(results).toHaveLength(2);
      results.forEach(order => {
        expect(order.sellTokenAddress).toBe(MOCK_ADDRESSES.tokenA);
      });
    });

    test("should filter by buy token address", () => {
      const results = database.getOrdersByBuyToken(MOCK_ADDRESSES.tokenC);
      
      expect(results).toHaveLength(2);
      results.forEach(order => {
        expect(order.buyTokenAddress).toBe(MOCK_ADDRESSES.tokenC);
      });
    });

    test("should filter with multiple criteria", () => {
      const results = database.getOrdersWithFilters({
        sellTokenAddress: MOCK_ADDRESSES.tokenA,
        buyTokenAddress: MOCK_ADDRESSES.tokenB,
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].sellTokenAddress).toBe(MOCK_ADDRESSES.tokenA);
      expect(results[0].buyTokenAddress).toBe(MOCK_ADDRESSES.tokenB);
    });

    test("should filter by escrow address", () => {
      const results = database.getOrdersWithFilters({
        escrowAddress: MOCK_ADDRESSES.escrow1,
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].escrowAddress).toBe(MOCK_ADDRESSES.escrow1);
    });

    test("should return empty array for non-matching filters", () => {
      const results = database.getOrdersWithFilters({
        sellTokenAddress: "0xNONEXISTENT",
      });
      
      expect(results).toEqual([]);
    });

    test("should return all orders when no filters provided", () => {
      const results = database.getOrdersWithFilters({});
      
      expect(results).toHaveLength(3);
    });
  });

  describe("escrowAddressExists", () => {
    test("should return true for existing escrow address", () => {
      const order = createMockOrder({ escrowAddress: MOCK_ADDRESSES.escrow1 });
      database.insertOrder(order);
      
      const exists = database.escrowAddressExists(MOCK_ADDRESSES.escrow1);
      
      expect(exists).toBe(true);
    });

    test("should return false for non-existing escrow address", () => {
      const exists = database.escrowAddressExists("non-existent-address");
      
      expect(exists).toBe(false);
    });
  });
});
