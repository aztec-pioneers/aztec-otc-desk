import { type Order } from "../../../orderflow-service/src/types/api";
export type OrderAPIResponse = { success: boolean, message: string, data: Order[] };
