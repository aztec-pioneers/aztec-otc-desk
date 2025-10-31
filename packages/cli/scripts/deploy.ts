import "dotenv/config";
import { deployTokenContract } from "@aztec-otc-desk/contracts/contract";
import { TOKEN_METADATA } from "@aztec-otc-desk/contracts/constants";
import { writeFileSync } from "node:fs"
import { getTestnetSendWaitOptions, getOTCAccounts } from "./utils";
import { createAztecNodeClient } from "@aztec/aztec.js/node";

// Deploys Ether and USD Coin token contracts
const { L2_NODE_URL } = process.env;
if (!L2_NODE_URL) throw new Error("L2_NODE_URL not set in env");

const main = async () => {
    const node = createAztecNodeClient(L2_NODE_URL);
    console.log("Connected to Aztec node at ", L2_NODE_URL);

    // get accounts
    const {
        sellerWallet: deployerWallet,
        sellerAddress: deployerAddress
    } = await getOTCAccounts(node);
    // if testnet, get send/ wait opts optimized for waiting and high gas
    const opts = await getTestnetSendWaitOptions(deployerWallet, deployerAddress);

    // deploy token contracts
    console.log("Deploying Wrapped Ether token contract");
    const eth = await deployTokenContract(
        deployerWallet,
        deployerAddress,
        TOKEN_METADATA.eth,
        opts
    );
    console.log("Ether token contract deployed, address: ", eth.address);

    console.log("Deploying USD Coin token contract");
    const usdc = await deployTokenContract(
        deployerWallet,
        deployerAddress,
        TOKEN_METADATA.usdc,
        opts
    );
    console.log("USDC token contract deployed, address: ", usdc.address);

    // write deployment to fs
    const deployments = {
        eth: { address: eth.address },
        usdc: { address: usdc.address }
    };
    // todo: add deployments for chainID
    const filepath = `${__dirname}/data/deployments.json`;
    writeFileSync(filepath, JSON.stringify(deployments, null, 2));
    console.log(`Deployments written to ${filepath}`);
}

main();
