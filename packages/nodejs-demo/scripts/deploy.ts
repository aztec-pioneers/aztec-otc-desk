import "dotenv/config";
import {
    createPXE,
    deployTokenContractWithMinter,
    TOKEN_METADATA,
} from "@aztec-otc-desk/contracts"
import { writeFileSync } from "node:fs"
import { getTestnetSendWaitOptions, getOTCAccounts } from "./utils";

// Deploys Ether and USD Coin token contracts
const main = async () => {
    const pxe = await createPXE();

    // get accounts
    const { seller } = await getOTCAccounts(pxe);

    // if testnet, get send/ wait opts optimized for waiting and high gas
    const opts = await getTestnetSendWaitOptions(pxe, false);

    // deploy token contracts
    console.log("Deploying Wrapped Ether token contract");
    const eth = await deployTokenContractWithMinter(TOKEN_METADATA.eth, seller, opts);
    console.log("eth token contract deployed, address: ", eth.address);

    console.log("Deploying USD Coin token contract");
    const usdc = await deployTokenContractWithMinter(TOKEN_METADATA.usdc, seller, opts);
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
