import {
  AccountWallet,
  AccountWalletWithSecretKey,
  AztecAddress,
  type ContractInstanceWithAddress,
  Fr,
  L1FeeJuicePortalManager,
  type PXE,
  SponsoredFeePaymentMethod,
  type Wallet,
  createLogger,
  getContractInstanceFromDeployParams,
} from '@aztec/aztec.js';
import type { LogFn } from '@aztec/foundation/log';
import { SponsoredFPCContract } from '@aztec/noir-contracts.js/SponsoredFPC';
import { SPONSORED_FPC_SALT } from '@aztec/constants';
import { createEthereumChain, createExtendedL1Client, FeeJuiceContract } from '@aztec/ethereum';
import { deriveStorageSlotInMap } from '@aztec/stdlib/hash';
import { UserFeeOptions } from '@aztec/entrypoints/interfaces';
import { GasSettings } from '@aztec/stdlib/gas';

export async function getSponsoredFPCInstance(): Promise<ContractInstanceWithAddress> {
  return await getContractInstanceFromDeployParams(SponsoredFPCContract.artifact, {
    salt: new Fr(SPONSORED_FPC_SALT),
  });
}

export async function getSponsoredFPCAddress() {
  return (await getSponsoredFPCInstance()).address;
}

export async function setupSponsoredFPC(deployer: Wallet, log?: LogFn) {
  const deployed = await SponsoredFPCContract.deploy(deployer)
    .send({ contractAddressSalt: new Fr(SPONSORED_FPC_SALT), universalDeploy: true })
    .deployed();

  log ? log(`SponsoredFPC: ${deployed.address}`) : null;
}

export async function getDeployedSponsoredFPCAddress(pxe: PXE) {
  const fpc = await getSponsoredFPCAddress();
  const contracts = await pxe.getContracts();
  if (!contracts.find(c => c.equals(fpc))) {
    throw new Error('SponsoredFPC not deployed.');
  }
  return fpc;
}

export async function getSponsoredFeePaymentMethod(pxe: PXE) {
  const paymentContract = await getDeployedSponsoredFPCAddress(pxe)
  return new SponsoredFeePaymentMethod(paymentContract)
}

export async function getFeeJuicePortalManager(
  pxe: PXE,
  l1RpcUrls: string[] = ["http://localhost:8545"],
  mnemonic: string = "test test test test test test test test test test test junk"
): Promise<L1FeeJuicePortalManager> {
  const { l1ChainId } = await pxe.getNodeInfo();
  const chain = createEthereumChain(l1RpcUrls, l1ChainId);
  const l1Client = createExtendedL1Client(
    chain.rpcUrls,
    mnemonic,
    chain.chainInfo
  );
  return await L1FeeJuicePortalManager.new(
    pxe,
    l1Client,
    createLogger("no")
  );
}

export async function getFeeJuicePublicBalance(
  pxe: PXE,
  owner: AztecAddress
): Promise<bigint> {
  const { protocolContractAddresses } = await pxe.getPXEInfo();
  const feeJuiceAddress = protocolContractAddresses.feeJuice;
  const slot = await deriveStorageSlotInMap(new Fr(1), owner);
  return (await pxe.getPublicStorageAt(feeJuiceAddress, slot)).toBigInt();
}

/**
 * Get fee options for high gas environment
 * @param feePadding - padding base fee gas (no clue what this does tbh)
 * @param feeMultiplier - multiplier for the base fee
 */
export async function getPriorityFeeOptions(
  pxe: PXE,
  feePadding: number,
  feeMultiplier: bigint
): Promise<UserFeeOptions> {
  return {
    baseFeePadding: feePadding,
    gasSettings: GasSettings.default({
      maxFeesPerGas: (await pxe.getCurrentBaseFees()).mul(feeMultiplier),
    }),
  }
}
