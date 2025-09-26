import { createPXEClient, waitForPXE } from "@aztec/aztec.js"
import { getInitialTestAccountsData } from "@aztec/accounts/testing"

import { TokenContract } from "@aztec/noir-contracts.js/Token";
import { createAztecNodeClient } from "@aztec/stdlib/interfaces/client";
import { TestWallet } from "@aztec/test-wallet";
import { TOKEN_METADATA } from "../ts/src";

// TODO: UPDATE FOR USE ON TESTNET LATER
async function main(){
  const {
    PXE_URL = 'http://localhost:8080',
    NODE_URL = 'http://localhost:8080',
  } = process.env;
  const node = createAztecNodeClient(NODE_URL);

  const pxe = createPXEClient(PXE_URL);
  await waitForPXE(pxe);

  const [minterAccountData] = await getInitialTestAccountsData();
  const minterWallet = new TestWallet(pxe, node);
  const minterAccount = await (minterWallet as TestWallet).createSchnorrAccount(
    minterAccountData.secret,
    minterAccountData.salt,
    minterAccountData.signingKey
  );
  const minter = { wallet: minterWallet, default: minterAccount };

  console.log(`============[Token Deployment]============`);
  console.log(`Minter Address: ${await minter.default.getAddress()}`);
  console.log(`Deploying tokens...`);

  const mints = []
  for (const metadata of Object.values(TOKEN_METADATA)) {
    const token = await TokenContract.deploy(
      minter.wallet,
      minter.default.getAddress(),
      metadata.name,
      metadata.symbol,
      metadata.decimals
    )
      .send({ from: await minter.default.getAddress() })
      .deployed();
    mints.push({ address: token.address, metadata });
    console.log("xxx", token.instance.currentContractClassId);
  }
  for (const mint of mints) {
    console.log(`Deployed ${mint.metadata.symbol} at ${mint.address}`);
  }
  console.log("Metadata: ", JSON.stringify(mints));
  console.log(`==========================================`);
}

if (import.meta.main) {
  main();
}