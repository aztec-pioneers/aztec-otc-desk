import { type LogFn, createLogger } from '@aztec/foundation/log';
import { Fr } from '@aztec/aztec.js/fields';
import { AztecAddress } from '@aztec/stdlib/aztec-address';
import { L1FeeJuicePortalManager, type L2AmountClaim } from "@aztec/aztec.js/ethereum";
import { createEthereumChain, createExtendedL1Client, FeeJuiceContract } from '@aztec/ethereum';
import { deriveStorageSlotInMap } from '@aztec/stdlib/hash';
import type { InteractionFeeOptions } from "@aztec/aztec.js/contracts";
import { GasSettings } from '@aztec/stdlib/gas';
import type { TestWallet } from '@aztec/test-wallet/server';
import { wad } from './utils';
import type { AztecNode } from '@aztec/aztec.js/node';
import { AccountManager, BaseWallet } from '@aztec/aztec.js/wallet';
import { SponsoredFeePaymentMethod } from '@aztec/aztec.js/fee';
import { getContractInstanceFromInstantiationParams } from '@aztec/aztec.js/contracts';
import { SponsoredFPCContractArtifact } from '@aztec/noir-contracts.js/SponsoredFPC';

// export async function getSponsoredFPCAddress() {
//   const sponsoredFPCInstance = await getContractInstanceFromInstantiationParams(SponsoredFPCContractArtifact, {
//     salt: new Fr(SPONSORED_FPC_SALT),
//   });
//   return sponsoredFPCInstance.address;
// }

// export async function setupSponsoredFPC(deployer: BaseWallet, from: AztecAddress, log?: LogFn) {
//   const deployed = await SponsoredFPCContract.deploy(deployer)
//     .send({ contractAddressSalt: new Fr(SPONSORED_FPC_SALT), universalDeploy: true, from })
//     .deployed();

//   log ? log(`SponsoredFPC: ${deployed.address}`) : null;
// }

// export async function getDeployedSponsoredFPCAddress(wallet: BaseWallet) {
//   const fpc = await getSponsoredFPCAddress();
//   const node = createAztecNodeClient("");
//   const contracts = await wallet.getChainInfo();
//   if (!contracts.find(c => c.equals(fpc))) {
//     throw new Error('SponsoredFPC not deployed.');
//   }
//   return fpc;
// }

export async function getSponsoredPaymentMethod(wallet: BaseWallet) {
    const instance = await getContractInstanceFromInstantiationParams(
        SponsoredFPCContractArtifact,
        { salt: new Fr(0) },
    );
    await wallet.registerContract(instance, SponsoredFPCContractArtifact);
    return new SponsoredFeePaymentMethod(instance.address)
}

export async function getFeeJuicePortalManager(
    node: AztecNode,
    l1RpcUrls: string[] = ["http://localhost:8545"],
    mnemonic: string = "test test test test test test test test test test test junk"
): Promise<L1FeeJuicePortalManager> {
    const { l1ChainId } = await node.getNodeInfo();
    const chain = createEthereumChain(l1RpcUrls, l1ChainId);
    const l1Client = createExtendedL1Client(
        chain.rpcUrls,
        mnemonic,
        chain.chainInfo
    );
    return await L1FeeJuicePortalManager.new(
        node,
        l1Client,
        createLogger("no")
    );
}

export async function getFeeJuicePublicBalance(
    node: AztecNode,
    from: AztecAddress,
): Promise<bigint> {
    const { feeJuice } = await node.getProtocolContractAddresses();
    const slot = await deriveStorageSlotInMap(new Fr(1), from);
    return await node.getPublicStorageAt("latest", feeJuice, slot).then(res => res.toBigInt());
}

/**
 * Get fee options for high gas environment
 * @param feePadding - padding base fee gas (no clue what this does tbh)
 * @param feeMultiplier - multiplier for the base fee
 */
export async function getPriorityFeeOptions(
    node: AztecNode,
    feeMultiplier: bigint
): Promise<InteractionFeeOptions> {
    const maxFeesPerGas = await node.getCurrentBaseFees()
        .then(res => res.mul(feeMultiplier));
    return { gasSettings: GasSettings.default({ maxFeesPerGas }) };
}

/**
 * Sets up an account with a claim
 * 
 * @param pxe PXE instance
 * @param feeJuicePortalManager L1FeeJuicePortalManager instance
 * @returns
 *      - account: the account that was created
 *      - claim: the claim to make once enough blocks have passed
 */
export const setupAccountWithFeeClaim = async (
    wallet: TestWallet,
    feeJuicePortalManager: L1FeeJuicePortalManager,
    amount: bigint = wad(1000n)
): Promise<{
    manager: AccountManager,
    key: { secretKey: Fr, salt: Fr }
    claim: L2AmountClaim,
}> => {
    const masterKey = Fr.random();
    const salt = Fr.random();
    const account = await wallet.createSchnorrAccount(masterKey, salt);

    const claim = await feeJuicePortalManager.bridgeTokensPublic(
        account.address,
        amount,
        true
    );
    return {
        manager: account,
        key: { secretKey: masterKey, salt },
        claim
    };
}
