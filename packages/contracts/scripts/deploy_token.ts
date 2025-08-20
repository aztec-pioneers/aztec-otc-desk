import {createPXEClient, waitForPXE } from "@aztec/aztec.js"
import {getInitialTestAccountsWallets} from "@aztec/accounts/testing"

import {TokenContract} from "../artifacts/Token"

const main = async () => {
    const { PXE_URL = 'http://localhost:8080' } = process.env;

    const pxe = createPXEClient(PXE_URL);
    await waitForPXE(pxe);

  const [ownerWallet] = await getInitialTestAccountsWallets(pxe);
  const ownerAddress = ownerWallet.getAddress();

  const {status, contract} = await TokenContract.deployWithOpts({
    wallet: ownerWallet,
    method: "constructor_with_minter"
  }, "Dummy", "DMT", 18, ownerAddress, ownerAddress).send().wait();

  
  if(status) {
    console.log(`Token contract deployed at address: ${contract.address}`);
  }
  else {
    console.error("Token contract deployment failed");
    process.exit(1);
  }

}

main()