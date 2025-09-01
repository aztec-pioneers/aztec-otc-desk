import {createPXE, deployTokenContractWithMinter, TOKEN_METADATA, wad} from "../../contracts/ts/test/utils/index"
import {getInitialTestAccounts, getInitialTestAccountsWallets} from "@aztec/accounts/testing"
import {writeFileSync} from "node:fs"
import { ethMintAmount, usdcMintAmount } from "./utils";

// Deploys two token contracts:
// - Eth
// - USDC
// - Mints 1 Eth to Buyer of the OTC
// - Mints 5000 USDC to Buyer of the OTC
const main = async ( ) => {
    const pxe = await createPXE();

    const wallets = await getInitialTestAccountsWallets(pxe);

    const minter = wallets[0];
    if(!minter) {
        throw new Error("Minter not found");
    }
    const seller = minter;
    const buyer = wallets[1];
    if(!buyer) {
        throw new Error("Buyer not found");
    }


    console.log("Deploying eth token contract");
    const eth = await deployTokenContractWithMinter(TOKEN_METADATA.weth, minter);
    console.log("Eth token contract deployed, address: ", eth.address);

    console.log("Deploying usdc token contract");
    const usdc = await deployTokenContractWithMinter(TOKEN_METADATA.usdc, minter);
    console.log("Usdc token contract deployed, address: ", usdc.address);


    console.log("Minting eth to seller");
    await eth.withWallet(minter).methods.mint_to_private(minter.getAddress(), seller.getAddress(), ethMintAmount).send().wait();
    console.log("Eth minted to seller");

    console.log("Checking eth balance of seller");
    const balance = await eth.methods.balance_of_private(seller.getAddress()).simulate();
    console.log("Eth balance of seller: ", balance);

    console.log("Minting usdc to buyer");
    await usdc.withWallet(minter).methods.mint_to_private(minter.getAddress(), buyer.getAddress(), usdcMintAmount).send().wait();
    console.log("Usdc minted to buyer");

    // console.log("Minting usdc to seller");
    // await usdc.withWallet(minter).methods.mint_to_private(minter.getAddress(), seller.getAddress(), usdcMintAmount).send().wait();
    // console.log("Usdc minted to seller");

    // console.log("Checking usdc balance of seller");
    // const usdcBalanceSeller = await usdc.methods.balance_of_private(seller.getAddress()).simulate();
    // console.log("Usdc balance of seller: ", usdcBalanceSeller);
    
    
    // console.log("Transferring usdc to buyer");
    // usdc.withWallet(minter).methods.transfer_private_to_private(minter.getAddress(), buyer.getAddress(), usdcMintAmount, 0).send().wait();
    // console.log("Usdc transferred to buyer");


    console.log("Checking usdc balance of buyer");
    const usdcBalance = await usdc.methods.balance_of_private(buyer.getAddress()).simulate();
    console.log("Usdc balance of buyer: ", usdcBalance);

    const deployments = {
        eth: {
            address: eth.address,
        },
        usdc: {
            address: usdc.address,
        }
    };

    writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
    console.log("Deployments written to deployments.json");
}

main();
