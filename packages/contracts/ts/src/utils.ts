import type { AztecNode } from "@aztec/aztec.js/node";

export const wad = (n: bigint = 1n, decimals: bigint = 18n) =>
    n * 10n ** decimals;


export const isTestnet = async (node: AztecNode): Promise<boolean> => {
    const chainId = await node.getNodeInfo().then(info => info.l1ChainId);
    return chainId === 11155111; // Sepolia testnet
}