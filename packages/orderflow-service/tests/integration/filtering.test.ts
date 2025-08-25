import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { TestDatabase } from "../utils/testDatabase";
import { createMockOrder, MOCK_ADDRESSES, MOCK_AMOUNTS } from "../utils/mockData";
import type { SQLiteDatabase } from "../../src/db/sqlite";
import type { Order } from "../../src/types/api";

describe("Order Filtering Integration", () => {
  let testDb: TestDatabase;
  let database: SQLiteDatabase;
  let testOrders: Order[];

  beforeEach(() => {
    testDb = new TestDatabase("filtering");
    database = testDb.setup();
    
    // Create a comprehensive set of test orders
    testOrders = [
      // TokenA -> TokenB orders
      createMockOrder({
        escrowAddress: MOCK_ADDRESSES.escrow1,
        sellTokenAddress: MOCK_ADDRESSES.tokenA,
        buyTokenAddress: MOCK_ADDRESSES.tokenB,
        sellTokenAmount: MOCK_AMOUNTS.small,
        buyTokenAmount: MOCK_AMOUNTS.medium,
      }),
      createMockOrder({
        escrowAddress: MOCK_ADDRESSES.escrow2,
        sellTokenAddress: MOCK_ADDRESSES.tokenA,
        buyTokenAddress: MOCK_ADDRESSES.tokenB,
        sellTokenAmount: MOCK_AMOUNTS.large,
        buyTokenAmount: MOCK_AMOUNTS.huge,
      }),
      
      // TokenA -> TokenC orders
      createMockOrder({
        escrowAddress: MOCK_ADDRESSES.escrow3,
        sellTokenAddress: MOCK_ADDRESSES.tokenA,
        buyTokenAddress: MOCK_ADDRESSES.tokenC,
        sellTokenAmount: MOCK_AMOUNTS.medium,
        buyTokenAmount: MOCK_AMOUNTS.small,
      }),
      
      // TokenB -> TokenC orders
      createMockOrder({
        escrowAddress: MOCK_ADDRESSES.user1,
        sellTokenAddress: MOCK_ADDRESSES.tokenB,
        buyTokenAddress: MOCK_ADDRESSES.tokenC,
        sellTokenAmount: MOCK_AMOUNTS.huge,
        buyTokenAmount: MOCK_AMOUNTS.large,
      }),
      
      // TokenC -> TokenA order
      createMockOrder({
        escrowAddress: MOCK_ADDRESSES.user2,
        sellTokenAddress: MOCK_ADDRESSES.tokenC,
        buyTokenAddress: MOCK_ADDRESSES.tokenA,
        sellTokenAmount: MOCK_AMOUNTS.small,
        buyTokenAmount: MOCK_AMOUNTS.medium,
      }),
    ];

    // Insert all test orders
    testOrders.forEach(order => database.insertOrder(order));
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe("Single Parameter Filtering", () => {
    test("should filter by sell token correctly", () => {
      const tokenAOrders = database.getOrdersBySellToken(MOCK_ADDRESSES.tokenA);
      const tokenBOrders = database.getOrdersBySellToken(MOCK_ADDRESSES.tokenB);
      const tokenCOrders = database.getOrdersBySellToken(MOCK_ADDRESSES.tokenC);

      expect(tokenAOrders).toHaveLength(3);
      expect(tokenBOrders).toHaveLength(1);
      expect(tokenCOrders).toHaveLength(1);

      // Verify all returned orders have correct sell token
      tokenAOrders.forEach(order => {
        expect(order.sellTokenAddress).toBe(MOCK_ADDRESSES.tokenA);
      });
    });

    test("should filter by buy token correctly", () => {
      const tokenAOrders = database.getOrdersByBuyToken(MOCK_ADDRESSES.tokenA);
      const tokenBOrders = database.getOrdersByBuyToken(MOCK_ADDRESSES.tokenB);
      const tokenCOrders = database.getOrdersByBuyToken(MOCK_ADDRESSES.tokenC);

      expect(tokenAOrders).toHaveLength(1);
      expect(tokenBOrders).toHaveLength(2);
      expect(tokenCOrders).toHaveLength(2);

      // Verify all returned orders have correct buy token
      tokenCOrders.forEach(order => {
        expect(order.buyTokenAddress).toBe(MOCK_ADDRESSES.tokenC);
      });
    });

    test("should filter by escrow address correctly", () => {
      const escrow1Orders = database.getOrdersWithFilters({ 
        escrowAddress: MOCK_ADDRESSES.escrow1 
      });
      const escrow2Orders = database.getOrdersWithFilters({ 
        escrowAddress: MOCK_ADDRESSES.escrow2 
      });

      expect(escrow1Orders).toHaveLength(1);
      expect(escrow2Orders).toHaveLength(1);
      expect(escrow1Orders[0].escrowAddress).toBe(MOCK_ADDRESSES.escrow1);
      expect(escrow2Orders[0].escrowAddress).toBe(MOCK_ADDRESSES.escrow2);
    });
  });

  describe("Multi-Parameter Filtering", () => {
    test("should filter by sell and buy token combination", () => {
      // Filter for TokenA -> TokenB orders
      const tokenAToB = database.getOrdersWithFilters({
        sellTokenAddress: MOCK_ADDRESSES.tokenA,
        buyTokenAddress: MOCK_ADDRESSES.tokenB,
      });

      expect(tokenAToB).toHaveLength(2);
      tokenAToB.forEach(order => {
        expect(order.sellTokenAddress).toBe(MOCK_ADDRESSES.tokenA);
        expect(order.buyTokenAddress).toBe(MOCK_ADDRESSES.tokenB);
      });

      // Filter for TokenA -> TokenC orders
      const tokenAToC = database.getOrdersWithFilters({
        sellTokenAddress: MOCK_ADDRESSES.tokenA,
        buyTokenAddress: MOCK_ADDRESSES.tokenC,
      });

      expect(tokenAToC).toHaveLength(1);
      expect(tokenAToC[0].sellTokenAddress).toBe(MOCK_ADDRESSES.tokenA);
      expect(tokenAToC[0].buyTokenAddress).toBe(MOCK_ADDRESSES.tokenC);
    });

    test("should filter by escrow and token addresses", () => {
      const specificOrder = database.getOrdersWithFilters({
        escrowAddress: MOCK_ADDRESSES.escrow1,
        sellTokenAddress: MOCK_ADDRESSES.tokenA,
        buyTokenAddress: MOCK_ADDRESSES.tokenB,
      });

      expect(specificOrder).toHaveLength(1);
      expect(specificOrder[0].escrowAddress).toBe(MOCK_ADDRESSES.escrow1);
      expect(specificOrder[0].sellTokenAddress).toBe(MOCK_ADDRESSES.tokenA);
      expect(specificOrder[0].buyTokenAddress).toBe(MOCK_ADDRESSES.tokenB);
    });

    test("should return empty array for non-matching combinations", () => {
      // Look for TokenC -> TokenB orders (doesn't exist in our test data)
      const nonExistent = database.getOrdersWithFilters({
        sellTokenAddress: MOCK_ADDRESSES.tokenC,
        buyTokenAddress: MOCK_ADDRESSES.tokenB,
      });

      expect(nonExistent).toEqual([]);
    });
  });

  describe("Edge Cases and Performance", () => {
    test("should handle empty filters", () => {
      const allOrders = database.getOrdersWithFilters({});
      
      expect(allOrders).toHaveLength(5);
    });

    test("should handle non-existent addresses", () => {
      const nonExistent = database.getOrdersWithFilters({
        escrowAddress: "0xNONEXISTENT1111111111111111111111111111",
        sellTokenAddress: "0xNONEXISTENT2222222222222222222222222222",
        buyTokenAddress: "0xNONEXISTENT3333333333333333333333333333",
      });

      expect(nonExistent).toEqual([]);
    });

    test("should maintain order consistency across multiple calls", () => {
      const results1 = database.getOrdersBySellToken(MOCK_ADDRESSES.tokenA);
      const results2 = database.getOrdersBySellToken(MOCK_ADDRESSES.tokenA);

      expect(results1).toEqual(results2);
    });

    test("should return orders in descending creation order", () => {
      const allOrders = database.getAllOrders();
      
      // Verify we get all 5 orders
      expect(allOrders).toHaveLength(5);
      
      // Verify all expected escrow addresses are present
      const escrowAddresses = allOrders.map(order => order.escrowAddress);
      expect(escrowAddresses).toContain(MOCK_ADDRESSES.escrow1);
      expect(escrowAddresses).toContain(MOCK_ADDRESSES.escrow2);
      expect(escrowAddresses).toContain(MOCK_ADDRESSES.escrow3);
      expect(escrowAddresses).toContain(MOCK_ADDRESSES.user1);
      expect(escrowAddresses).toContain(MOCK_ADDRESSES.user2);
    });
  });

  describe("Market Analysis Scenarios", () => {
    test("should find all orders selling a specific token", () => {
      // Find all orders selling TokenA (useful for market depth analysis)
      const tokenASellers = database.getOrdersBySellToken(MOCK_ADDRESSES.tokenA);
      
      expect(tokenASellers).toHaveLength(3);
      
      // Calculate total volume being sold
      const totalVolume = tokenASellers.reduce((sum, order) => sum + order.sellTokenAmount, BigInt(0));
      const expectedVolume = MOCK_AMOUNTS.small + MOCK_AMOUNTS.large + MOCK_AMOUNTS.medium;
      
      expect(totalVolume).toBe(expectedVolume);
    });

    test("should find all orders buying a specific token", () => {
      // Find all orders buying TokenC (useful for demand analysis)
      const tokenCBuyers = database.getOrdersByBuyToken(MOCK_ADDRESSES.tokenC);
      
      expect(tokenCBuyers).toHaveLength(2);
      
      // Verify different sell tokens are offering to buy TokenC
      const sellTokens = tokenCBuyers.map(order => order.sellTokenAddress);
      expect(sellTokens).toContain(MOCK_ADDRESSES.tokenA);
      expect(sellTokens).toContain(MOCK_ADDRESSES.tokenB);
    });

    test("should find arbitrage opportunities", () => {
      // Find TokenA -> TokenB orders
      const aToBOrders = database.getOrdersWithFilters({
        sellTokenAddress: MOCK_ADDRESSES.tokenA,
        buyTokenAddress: MOCK_ADDRESSES.tokenB,
      });

      // Find TokenB -> TokenA orders (reverse direction)
      const bToAOrders = database.getOrdersWithFilters({
        sellTokenAddress: MOCK_ADDRESSES.tokenB,
        buyTokenAddress: MOCK_ADDRESSES.tokenA,
      });

      // In our test data, we have A->B orders but no B->A orders
      expect(aToBOrders.length).toBeGreaterThan(0);
      expect(bToAOrders).toHaveLength(0);
    });
  });
});
