import { type Order } from "../../../api/src/types/api";
export type OrderAPIResponse = { success: boolean, message: string, data: Order[] };
