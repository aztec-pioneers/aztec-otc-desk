
import { createOrderHandlers } from "./handlers";
import { SQLiteDatabase } from "./db";

// CORS configuration
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Helper function to add CORS headers to any response
const withCORS = async (responseOrPromise: Response | Promise<Response>): Promise<Response> => {
  const response = await responseOrPromise;
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

/**
 * Orderflow Service
 * 
 * A Bun-based HTTP server for handling order operations in the Aztec OTC Desk.
 */

const main = async () => {
  // Create and initialize database
  const database = new SQLiteDatabase();
  database.initialize();
  
  // Create handlers with database dependency injection
  const {
    handleCreateOrder,
    handleGetOrder,
    handleCloseOrder,
    handleOTCMatchOrder
  } = createOrderHandlers(database);
  
  const server = Bun.serve({
    port: 3000,
    fetch(req) {
      const url = new URL(req.url);

      // Handle preflight OPTIONS requests
      if (req.method === 'OPTIONS') {
        return withCORS(new Response(null, { status: 204 }));
      }
      
      // POST /order endpoint

      if (url.pathname === "/order") {
        switch (req.method) {
          case "POST":
            return withCORS(handleCreateOrder(req));
          case "GET":
            return withCORS(handleGetOrder(req));
          case "DELETE":
            return withCORS(handleCloseOrder(req));
          default:
            return withCORS(new Response("Method Not Allowed", { status: 405 }));
        }
      }

      // POST /order/match endpoint
      if (url.pathname === "/order/match" && req.method === "POST") {
        return withCORS(handleOTCMatchOrder(req));
      }

      // healthcheck endpoint
      if (req.method === "GET" && url.pathname === "/health") {
        return withCORS(new Response("OK", { status: 200 }));
      }

      // Handle 404
      return withCORS(new Response("Not Found", { status: 404 }));
    },
  });

  console.log(`🚀 Orderflow Service running on http://localhost:${server.port}`);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    database.close();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    database.close();
    process.exit(0);
  });
};

main();