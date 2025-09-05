import { createPXEClient, PXE, waitForPXE } from "@aztec/aztec.js";

export const createPXE = async (id: number = 0) => {
    const { BASE_PXE_URL = `http://localhost` } = process.env;
    const url = `${BASE_PXE_URL}:${8080 + id}`;
    const pxe = createPXEClient(url);
    await waitForPXE(pxe);
    return pxe;
};

export const wad = (n: bigint = 1n, decimals: bigint = 18n) =>
    n * 10n ** decimals;


export const isTestnet = async (pxe: PXE): Promise<boolean> => {
    const chainId = (await pxe.getNodeInfo()).l1ChainId;
    return chainId === 11155111; // Sepolia testnet
}