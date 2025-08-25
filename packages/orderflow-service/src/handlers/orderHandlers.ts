import type { RequestHandler, ApiResponse, OrderResponse, Order, CreateOrderRequest } from "../types/api";
import { database } from "../db";
import { generateOrderId } from "../utils/uuid";

/**
 * Handle POST /order - Create a new order
 */
export const handleCreateOrder: RequestHandler = async (req: Request): Promise<Response> => {
  try {
    // Parse the request body (excluding orderId)
    const createOrderData: CreateOrderRequest = await req.json();
    
    // Generate a unique order ID
    const orderId = generateOrderId();
    
    // Create the complete order object
    const order: Order = {
      orderId,
      ...createOrderData
    };
    
    // Save to database
    const savedOrder = database.insertOrder(order);
    
    const response: ApiResponse<Order> = {
      success: true,
      message: "Order created successfully",
      data: savedOrder
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to create order";
    
    // Check if it's a duplicate escrow address error
    const isDuplicateEscrow = errorMessage.includes("already exists");
    
    const response: ApiResponse = {
      success: false,
      error: errorMessage
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: isDuplicateEscrow ? 409 : 500, // 409 Conflict for duplicates, 500 for other errors
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};

/**
 * Handle GET /order - Retrieve order(s)
 */
export const handleGetOrder: RequestHandler = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("id");
    
    // TODO: Implement order retrieval logic
    // This would return Order[] for all orders or Order for specific order
    
    const response: ApiResponse<Order[]> = {
      success: true,
      message: "Order retrieval endpoint - implementation pending",
      data: [] // Would be actual Order data in real implementation
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to process request"
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
