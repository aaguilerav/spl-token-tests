import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

(async () => {

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    const tokenAccounts = await connection.getTokenAccountsByOwner(
        new PublicKey('BRKEvzr1ixfH4gGBGpdqkYKDgB66Rm6oDCyBax1qXLuJ'),
        {
            programId: TOKEN_PROGRAM_ID,
        }
    );

    console.log("Token                                         Balance");
    console.log("------------------------------------------------------------");
    tokenAccounts.value.forEach((tokenAccount) => {
        const accountData = AccountLayout.decode(tokenAccount.account.data);
        console.log(`${new PublicKey(accountData.mint)}   ${accountData.amount}`);
    })

})();
