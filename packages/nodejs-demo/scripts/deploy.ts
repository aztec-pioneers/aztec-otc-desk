import "dotenv/config";
import {
    createPXE,
    deployTokenContractWithMinter,
    getPriorityFeeOptions,
    isTestnet,
    TOKEN_METADATA,
} from "@aztec-otc-desk/contracts"
import { writeFileSync } from "node:fs"
import { getFeeSendOptions, getOTCAccounts } from "./utils";
import { AztecAddress } from "@aztec/aztec.js";

// Deploys Ether and USD Coin token contracts
const main = async () => {
    const pxe = await createPXE();

    // get accounts
    const { seller } = await getOTCAccounts(pxe);

    // if testnet, send with high gas fee allowance
    const sendOptions = await getFeeSendOptions(pxe, false);

    // deploy token contracts
    console.log("Deploying Wrapped Ether token contract");
    const eth = await deployTokenContractWithMinter(TOKEN_METADATA.eth, seller, sendOptions);
    console.log("eth token contract deployed, address: ", eth.address);

    console.log("Deploying USD Coin token contract");
    const usdc = await deployTokenContractWithMinter(TOKEN_METADATA.usdc, seller, sendOptions);
    console.log("USDC token contract deployed, address: ", usdc.address);

    // write deployment to fs
    const deployments = {
        eth: { address: eth.address },
        usdc: { address: usdc.address }
    };
    const filepath = `${__dirname}/data/deployments.json`;
    writeFileSync(filepath, JSON.stringify(deployments, null, 2));
    console.log(`Deployments written to ${filepath}`);
}

main();
