import {createPXE, deployTokenContractWithMinter, TOKEN_METADATA, wad} from "../../contracts/ts/test/utils/index"
import {getInitialTestAccounts, getInitialTestAccountsWallets} from "@aztec/accounts/testing"
import {writeFileSync} from "node:fs"
import { ethMintAmount, getAccountFromEnv, getOTCAccounts, isTestnet, usdcMintAmount } from "./utils";
import type { AccountWalletWithSecretKey } from "@aztec/aztec.js";

// Deploys WETH and USDC token contracts
const main = async ( ) => {
    const pxe = await createPXE();

    // get accounts
    const { seller } = await getOTCAccounts(pxe);

    // deploy token contracts
    console.log("Deploying Wrapped Ether token contract");
    const weth = await deployTokenContractWithMinter(TOKEN_METADATA.weth, seller);
    console.log("WETH token contract deployed, address: ", weth.address);

    console.log("Deploying Circle USDC token contract");
    const usdc = await deployTokenContractWithMinter(TOKEN_METADATA.usdc, seller);
    console.log("USDC token contract deployed, address: ", usdc.address);

    // write deployment to fs
    const deployments = {
        eth: { address: weth.address, },
        usdc: { address: usdc.address }
    };
    const filepath = `${__dirname}/data/deployments.json`;
    writeFileSync(filepath, JSON.stringify(deployments, null, 2));
    console.log(`Deployments written to ${filepath}`);
}

main();
