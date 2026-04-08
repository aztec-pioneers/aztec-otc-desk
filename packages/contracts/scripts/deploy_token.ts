import { getInitialTestAccountsData } from "@aztec/accounts/testing"
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { EmbeddedWallet } from "@aztec/wallets/embedded";
import { TokenContract } from "../ts/src/artifacts/index.js"

const main = async () => {
    const { AZTEC_NODE_URL = 'http://localhost:8080' } = process.env;

    const node = createAztecNodeClient(AZTEC_NODE_URL);
    const wallet = await EmbeddedWallet.create(node);
    const [ownerAccount] = await getInitialTestAccountsData();
    const ownerAddress = (await wallet.createSchnorrAccount(ownerAccount.secret, ownerAccount.salt, ownerAccount.signingKey)).address;

    const { contract } = await TokenContract.deployWithOpts({
        wallet,
        method: "constructor_with_minter"
    }, "Dummy", "DMT", 18, ownerAddress).send({ from: ownerAddress });

    console.log(`Token contract deployed at address: ${contract.address}`);
}

main()
