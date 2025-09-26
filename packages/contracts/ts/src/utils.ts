import { AztecNode, createAztecNodeClient, createPXEClient, PXE, waitForPXE } from "@aztec/aztec.js";

export const createPXE = async (id: number = 0) => {
    const { BASE_PXE_URL = `http://localhost` } = process.env;
    const url = `${BASE_PXE_URL}:${8080 + id}`;
    const pxe = createPXEClient(url);
    await waitForPXE(pxe);
    return pxe;
};

export const createNode = async () => {
    const { BASE_NODE_URL = `http://localhost` } = process.env;
    const url = `${BASE_NODE_URL}:${8080}`;
    return createAztecNodeClient(url);
}

export const wad = (n: bigint = 1n, decimals: bigint = 18n) =>
    n * 10n ** decimals;


export const isTestnet = async (node: AztecNode): Promise<boolean> => {
    const chainId = (await node.getNodeInfo()).l1ChainId;
    return chainId === 11155111; // Sepolia testnet
}