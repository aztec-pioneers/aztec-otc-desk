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