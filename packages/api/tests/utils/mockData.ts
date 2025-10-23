import type { Order, CreateOrderRequest } from "../../src/types/api";
import { generateOrderId } from "../../src/utils/uuid";

/**
 * Mock data factory for tests
 */

export function createMockOrderRequest(overrides: Partial<CreateOrderRequest> = {}): CreateOrderRequest {
  return {
    escrowAddress: "0x1234567890abcdef1234567890abcdef12345678",
    sellTokenAddress: "0x5678901234abcdef5678901234abcdef56789012",
    sellTokenAmount: BigInt("1000000000000000000"),
    buyTokenAddress: "0x9abcdef123456789abcdef123456789abcdef12",
    buyTokenAmount: BigInt("2000000000000000000"),
    ...overrides
  };
}

export function createMockOrder(overrides: Partial<Order> = {}): Order {
  const baseOrder = createMockOrderRequest();
  return {
    orderId: generateOrderId(),
    ...baseOrder,
    ...overrides
  };
}

export const MOCK_ADDRESSES = {
  escrow1: "0x1111111111111111111111111111111111111111",
  escrow2: "0x2222222222222222222222222222222222222222",
  escrow3: "0x3333333333333333333333333333333333333333",
  
  tokenA: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  tokenB: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
  tokenC: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
  
  user1: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  user2: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
};

export const MOCK_AMOUNTS = {
  small: BigInt("1000000000000000000"),     // 1 token (18 decimals)
  medium: BigInt("5000000000000000000"),    // 5 tokens
  large: BigInt("10000000000000000000"),    // 10 tokens
  huge: BigInt("100000000000000000000"),    // 100 tokens
};
