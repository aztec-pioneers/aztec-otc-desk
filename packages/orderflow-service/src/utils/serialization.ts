import type { Order } from "../types/api";

/**
 * Serialize an Order object by converting BigInt values to strings
 */
export function serializeOrder(order: Order): any {
  return {
    ...order,
    sellTokenAmount: order.sellTokenAmount.toString(),
    buyTokenAmount: order.buyTokenAmount.toString()
  };
}

/**
 * Serialize an array of Order objects
 */
export function serializeOrders(orders: Order[]): any[] {
  return orders.map(order => serializeOrder(order));
}

/**
 * Custom JSON.stringify that handles BigInt values
 */
export function stringifyWithBigInt(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}
