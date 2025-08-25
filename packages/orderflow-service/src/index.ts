
import { handleCreateOrder, handleGetOrder } from "./handlers";
import { database } from "./db";

/**
 * Orderflow Service
 * 
 * A Bun-based HTTP server for handling order operations in the Aztec OTC Desk.
 */

const main = async () => {
  // Initialize database
  database.initialize();
  const server = Bun.serve({
    port: 3000,
    fetch(req) {
      const url = new URL(req.url);
      
      // POST /order endpoint
      if (req.method === "POST" && url.pathname === "/order") {
        return handleCreateOrder(req);
      }
      
      // GET /order endpoint
      if (req.method === "GET" && url.pathname === "/order") {
        return handleGetOrder(req);
      }
      
      // Handle 404
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`🚀 Orderflow Service running on http://localhost:${server.port}`);
};

main();