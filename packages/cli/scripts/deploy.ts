import "dotenv/config";
import {
    createPXE,
    deployTokenContractWithMinter,
    TOKEN_METADATA,
} from "@aztec-otc-desk/contracts"
import { writeFileSync } from "node:fs"
import { getOTCAccounts } from "./utils";
import { AztecAddress } from "@aztec/aztec.js";

// Deploys WETH and USDC token contracts
const main = async () => {
    const pxe = await createPXE();

    // get accounts
    const { seller } = await getOTCAccounts(pxe);

    // deploy token contracts
    // console.log("Deploying Wrapped Ether token contract");
    // const weth = await deployTokenContractWithMinter(TOKEN_METADATA.weth, seller);
    // console.log("WETH token contract deployed, address: ", weth.address);

    console.log("Deploying Circle USDC token contract");
    const usdc = await deployTokenContractWithMinter(TOKEN_METADATA.usdc, seller);
    console.log("USDC token contract deployed, address: ", usdc.address);

    // write deployment to fs
    const deployments = {
        // weth: { address: weth.address, },
        weth: { address: AztecAddress.fromString("0x124623584d9a7f72d0128bfcfa1427b7b1d5a064e13d3199bbf51e8bbf64492a")}, 
        usdc: { address: usdc.address }
    };
    const filepath = `${__dirname}/data/deployments.json`;
    writeFileSync(filepath, JSON.stringify(deployments, null, 2));
    console.log(`Deployments written to ${filepath}`);
}

main();
