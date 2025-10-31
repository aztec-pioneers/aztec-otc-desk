// import { createPXEClient, PXE, waitForPXE } from "@aztec/aztec.js";
// import { type PXE, createPXE } from "@aztec/pxe/server"; // ensure PXE type is imported

import type { AztecNode } from "@aztec/aztec.js/node";

// export const createPXE = async (id: number = 0) => {
//     const { BASE_PXE_URL = `http://localhost` } = process.env;
//     const url = `${BASE_PXE_URL}:${8080 + id}`;
//     const pxe = createPXEClient(url);
//     await waitForPXE(pxe);
//     return pxe;
// };

export const wad = (n: bigint = 1n, decimals: bigint = 18n) =>
    n * 10n ** decimals;


export const isTestnet = async (node: AztecNode): Promise<boolean> => {
    const chainId = await node.getNodeInfo().then(info => info.l1ChainId);
    return chainId === 11155111; // Sepolia testnet
}