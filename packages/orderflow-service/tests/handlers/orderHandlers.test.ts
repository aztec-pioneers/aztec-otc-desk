import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { TestDatabase } from "../utils/testDatabase";
import { createMockOrderRequest, MOCK_ADDRESSES, MOCK_AMOUNTS } from "../utils/mockData";
import { createOrderHandlers } from "../../src/handlers/orderHandlers";
import type { SQLiteDatabase } from "../../src/db/sqlite";

describe("Order Handlers", () => {
  let testDb: TestDatabase;
  let database: SQLiteDatabase;
  let handlers: ReturnType<typeof createOrderHandlers>;

  beforeEach(() => {
    testDb = new TestDatabase("handlers");
    database = testDb.setup();
    handlers = createOrderHandlers(database);
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe("POST /order (handleCreateOrder)", () => {
    test("should create order successfully", async () => {
      const mockOrderRequest = createMockOrderRequest();
      const requestBody = {
        ...mockOrderRequest,
        sellTokenAmount: mockOrderRequest.sellTokenAmount.toString(),
        buyTokenAmount: mockOrderRequest.buyTokenAmount.toString(),
      };
      
      const request = new Request("http://localhost:3000/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const response = await handlers.handleCreateOrder(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe("Order created successfully");
      expect(responseData.data).toMatchObject({
        escrowAddress: mockOrderRequest.escrowAddress,
        sellTokenAddress: mockOrderRequest.sellTokenAddress,
        sellTokenAmount: mockOrderRequest.sellTokenAmount.toString(),
        buyTokenAddress: mockOrderRequest.buyTokenAddress,
        buyTokenAmount: mockOrderRequest.buyTokenAmount.toString(),
      });
      expect(responseData.data.orderId).toBeDefined();
    });

    test("should prevent duplicate escrow addresses", async () => {
      const mockOrderRequest = createMockOrderRequest({ 
        escrowAddress: MOCK_ADDRESSES.escrow1 
      });
      const requestBody = {
        ...mockOrderRequest,
        sellTokenAmount: mockOrderRequest.sellTokenAmount.toString(),
        buyTokenAmount: mockOrderRequest.buyTokenAmount.toString(),
      };

      // Create first order
      const request1 = new Request("http://localhost:3000/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const response1 = await handlers.handleCreateOrder(request1);
      expect(response1.status).toBe(200);

      // Try to create second order with same escrow
      const request2 = new Request("http://localhost:3000/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const response2 = await handlers.handleCreateOrder(request2);
      const responseData2 = await response2.json();

      expect(response2.status).toBe(409);
      expect(responseData2.success).toBe(false);
      expect(responseData2.error).toContain("already exists");
    });

    test("should handle invalid JSON", async () => {
      const request = new Request("http://localhost:3000/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      const response = await handlers.handleCreateOrder(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
    });

    test("should handle BigInt conversion errors", async () => {
      const mockOrderRequest = createMockOrderRequest();
      const requestBody = {
        ...mockOrderRequest,
        sellTokenAmount: "invalid-bigint",
        buyTokenAmount: mockOrderRequest.buyTokenAmount.toString(),
      };

      const request = new Request("http://localhost:3000/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const response = await handlers.handleCreateOrder(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
    });
  });

  describe("GET /order (handleGetOrder)", () => {
    beforeEach(async () => {
      // Create test orders
      const orders = [
        createMockOrderRequest({
          escrowAddress: MOCK_ADDRESSES.escrow1,
          sellTokenAddress: MOCK_ADDRESSES.tokenA,
          buyTokenAddress: MOCK_ADDRESSES.tokenB,
        }),
        createMockOrderRequest({
          escrowAddress: MOCK_ADDRESSES.escrow2,
          sellTokenAddress: MOCK_ADDRESSES.tokenA,
          buyTokenAddress: MOCK_ADDRESSES.tokenC,
        }),
        createMockOrderRequest({
          escrowAddress: MOCK_ADDRESSES.escrow3,
          sellTokenAddress: MOCK_ADDRESSES.tokenB,
          buyTokenAddress: MOCK_ADDRESSES.tokenC,
        }),
      ];

      for (const orderRequest of orders) {
        const requestBody = {
          ...orderRequest,
          sellTokenAmount: orderRequest.sellTokenAmount.toString(),
          buyTokenAmount: orderRequest.buyTokenAmount.toString(),
        };
        
        const request = new Request("http://localhost:3000/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        
        await handlers.handleCreateOrder(request);
      }
    });

    test("should get all orders", async () => {
      const request = new Request("http://localhost:3000/order");
      const response = await handlers.handleGetOrder(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(3);
      expect(responseData.message).toBe("Retrieved 3 order(s)");
    });

    test("should get order by ID", async () => {
      // First get all orders to find an ID
      const getAllRequest = new Request("http://localhost:3000/order");
      const getAllResponse = await handlers.handleGetOrder(getAllRequest);
      const getAllData = await getAllResponse.json();
      const orderId = getAllData.data[0].orderId;

      // Now get specific order
      const request = new Request(`http://localhost:3000/order?id=${orderId}`);
      const response = await handlers.handleGetOrder(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(1);
      expect(responseData.data[0].orderId).toBe(orderId);
      expect(responseData.message).toBe("Order retrieved successfully");
    });

    test("should return 404 for non-existent order ID", async () => {
      const request = new Request("http://localhost:3000/order?id=non-existent-id");
      const response = await handlers.handleGetOrder(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.data).toEqual([]);
      expect(responseData.error).toContain("not found");
    });

    test("should filter by escrow address", async () => {
      const request = new Request(`http://localhost:3000/order?escrow_address=${MOCK_ADDRESSES.escrow1}`);
      const response = await handlers.handleGetOrder(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(1);
      expect(responseData.data[0].escrowAddress).toBe(MOCK_ADDRESSES.escrow1);
      expect(responseData.message).toContain("filtered by escrow");
    });

    test("should filter by sell token address", async () => {
      const request = new Request(`http://localhost:3000/order?sell_token_address=${MOCK_ADDRESSES.tokenA}`);
      const response = await handlers.handleGetOrder(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(2);
      responseData.data.forEach((order: any) => {
        expect(order.sellTokenAddress).toBe(MOCK_ADDRESSES.tokenA);
      });
      expect(responseData.message).toContain("filtered by sell token");
    });

    test("should filter by buy token address", async () => {
      const request = new Request(`http://localhost:3000/order?buy_token_address=${MOCK_ADDRESSES.tokenC}`);
      const response = await handlers.handleGetOrder(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(2);
      responseData.data.forEach((order: any) => {
        expect(order.buyTokenAddress).toBe(MOCK_ADDRESSES.tokenC);
      });
      expect(responseData.message).toContain("filtered by buy token");
    });

    test("should filter by multiple parameters", async () => {
      const request = new Request(
        `http://localhost:3000/order?sell_token_address=${MOCK_ADDRESSES.tokenA}&buy_token_address=${MOCK_ADDRESSES.tokenB}`
      );
      const response = await handlers.handleGetOrder(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(1);
      expect(responseData.data[0].sellTokenAddress).toBe(MOCK_ADDRESSES.tokenA);
      expect(responseData.data[0].buyTokenAddress).toBe(MOCK_ADDRESSES.tokenB);
      expect(responseData.message).toContain("sell token");
      expect(responseData.message).toContain("buy token");
    });

    test("should return empty array for non-matching filters", async () => {
      const request = new Request("http://localhost:3000/order?sell_token_address=0xNONEXISTENT");
      const response = await handlers.handleGetOrder(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual([]);
      expect(responseData.message).toContain("Retrieved 0 order(s)");
    });

    test("should handle server errors gracefully", async () => {
      // Close the database to simulate an error
      database.close();
      
      const request = new Request("http://localhost:3000/order");
      const response = await handlers.handleGetOrder(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
    });
  });
});
