/**
 * Order Type
 */
export interface Order {
  orderId: string;
  escrowAddress: string;
  sellTokenAddress: string;
  sellTokenAmount: BigInt;
  buyTokenAddress: string;
  buyTokenAmount: BigInt;
}

/**
 * Order Creation Type (orderId is generated server-side)
 */
export interface CreateOrderRequest {
  escrowAddress: string;
  sellTokenAddress: string;
  sellTokenAmount: BigInt;
  buyTokenAddress: string;
  buyTokenAmount: BigInt;
}

/**
 * Serialized Order Type (for API responses)
 */
export interface SerializedOrder {
  orderId: string;
  escrowAddress: string;
  sellTokenAddress: string;
  sellTokenAmount: string; // BigInt serialized to string
  buyTokenAddress: string;
  buyTokenAmount: string;  // BigInt serialized to string
}

/**
 * API Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface OrderResponse extends ApiResponse {
  orderId?: string;
}

export type RequestHandler = (req: Request) => Promise<Response>;