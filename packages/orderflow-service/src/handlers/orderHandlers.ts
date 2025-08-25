import type { RequestHandler, ApiResponse, OrderResponse, Order, CreateOrderRequest } from "../types/api";
import type { IDatabase } from "../db";
import { generateOrderId } from "../utils/uuid";
import { stringifyWithBigInt, serializeOrder, serializeOrders } from "../utils/serialization";

/**
 * Create order handlers with database dependency injection
 */
export function createOrderHandlers(database: IDatabase) {
  /**
   * Handle POST /order - Create a new order
   */
  const handleCreateOrder: RequestHandler = async (req: Request): Promise<Response> => {
  try {
    // Parse the request body (excluding orderId)
    const rawData = await req.json();
    
    // Convert string amounts to BigInt
    const createOrderData: CreateOrderRequest = {
      escrowAddress: rawData.escrowAddress,
      sellTokenAddress: rawData.sellTokenAddress,
      sellTokenAmount: BigInt(rawData.sellTokenAmount),
      buyTokenAddress: rawData.buyTokenAddress,
      buyTokenAmount: BigInt(rawData.buyTokenAmount)
    };
    
    // Generate a unique order ID
    const orderId = generateOrderId();
    
    // Create the complete order object
    const order: Order = {
      orderId,
      ...createOrderData
    };
    
    // Save to database
    const savedOrder = database.insertOrder(order);
    
    const response: ApiResponse<any> = {
      success: true,
      message: "Order created successfully",
      data: serializeOrder(savedOrder)
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
  const handleGetOrder: RequestHandler = async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const orderId = url.searchParams.get("id");
      const escrowAddress = url.searchParams.get("escrow_address");
      const sellTokenAddress = url.searchParams.get("sell_token_address");
      const buyTokenAddress = url.searchParams.get("buy_token_address");
      
      let orders: Order[];
      let message: string;
      
      // If orderId is provided, get specific order
      if (orderId) {
        const order = database.getOrderById(orderId);
        
        if (!order) {
          const response: ApiResponse<any[]> = {
            success: false,
            error: `Order with ID ${orderId} not found`,
            data: []
          };
          
          return new Response(
            JSON.stringify(response),
            {
              status: 404,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
        
        orders = [order]; // Return single order in an array
        message = "Order retrieved successfully";
      } else if (escrowAddress || sellTokenAddress || buyTokenAddress) {
        // If any filter parameters are provided, use filtered query
        const filters: any = {};
        if (escrowAddress) filters.escrowAddress = escrowAddress;
        if (sellTokenAddress) filters.sellTokenAddress = sellTokenAddress;
        if (buyTokenAddress) filters.buyTokenAddress = buyTokenAddress;
        
        orders = database.getOrdersWithFilters(filters);
        
        const filterDescriptions: string[] = [];
        if (escrowAddress) filterDescriptions.push(`escrow: ${escrowAddress}`);
        if (sellTokenAddress) filterDescriptions.push(`sell token: ${sellTokenAddress}`);
        if (buyTokenAddress) filterDescriptions.push(`buy token: ${buyTokenAddress}`);
        
        message = `Retrieved ${orders.length} order(s) filtered by ${filterDescriptions.join(', ')}`;
      } else {
        // If no parameters provided, return all orders
        orders = database.getAllOrders();
        message = `Retrieved ${orders.length} order(s)`;
      }
      
      const response: ApiResponse<any[]> = {
        success: true,
        message: message,
        data: serializeOrders(orders)
      };
      
      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (error) {
      console.error("Error retrieving order(s):", error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve orders"
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

  return {
    handleCreateOrder,
    handleGetOrder
  };
}
