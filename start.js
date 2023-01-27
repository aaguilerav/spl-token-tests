#!/usr/bin/env node

const {
    getClusterConnection
} = require('./helpers/input.js');

const {
    createMint,
    getMint,
    getOrCreateAssociatedTokenAccount,
    getAccount,
    mintTo,
    getAssociatedTokenAddress,
    transfer
} = require('@solana/spl-token');

const {
    clusterApiUrl,
    PublicKey,
    Keypair,
    sendAndConfirmTransaction,
    Transaction,
    SystemProgram,
    TransactionInstruction
} = require('@solana/web3.js');

const log = console.log;
const payer_privkey = require('./helpers/pk-payer.json');
const token_holder_privkey = require('./helpers/pk-token-holder.json');
const mintauth_privkey = require('./helpers/pk-mint-authority.json');
const freezeauth_privkey = require('./helpers/pk-freeze-authority.json');

// SOLANA-TESTNET
// const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
// const ATOKEN_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// PL-SOLANA-TESTNET
// const TOKEN_PROGRAM = new PublicKey('TokenRfZiRqUVXKudCmtATpN3fCPksF1sPbV5vJZxcG');
// const ATOKEN_PROGRAM = new PublicKey('AToknjumD5QTN4NKinA2nigT82vp6EvWt3wnUzs7gbsp');

// PL-SOLANA-TESTNET && PL-SOLANA-MAINNET
const TOKEN_PROGRAM = new PublicKey('Token1ZAxcjfmf3ANqs2HEiWXYWHUbkhGynugUn4Joo');
const ATOKEN_PROGRAM = new PublicKey('ATokenjsNccUwTeSVA7oCcpj9qHYBV1eA7WhSZRzEkB4');

// Implementation taken from: node_modules/@solana/spl-token/src/instructions/associatedTokenAccount.ts:17
const buildAssociatedTokenAccountInstructionForked = (
    payer,
    associatedToken,
    owner,
    mint,
    instructionData,
    programId,
    associatedTokenProgramId
) => {
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: associatedToken, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: programId, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
        keys,   
        programId: associatedTokenProgramId,
        data: instructionData,
    });
}

// Implementation taken from: node_modules/@solana/spl-token/src/instructions/associatedTokenAccount.ts:67
const createAssociatedTokenAccountInstructionForked = (
    payer,
    associatedToken,
    owner,
    mint,
    programId,
    associatedTokenProgramId
) => {
    return buildAssociatedTokenAccountInstructionForked(
        payer,
        associatedToken,
        owner,
        mint,
        Buffer.alloc(0),
        programId,
        associatedTokenProgramId
    );
}

/**
 * ENTRYPOINT
 */
const main = async () => {

    const connection = getClusterConnection();
    log(`Connecting to: ${connection.rpcEndpoint}`);

    // STEP-0 Load keys
    const payer = Keypair.fromSecretKey(Uint8Array.from(payer_privkey));
    const token_holder = Keypair.fromSecretKey(Uint8Array.from(token_holder_privkey));
    const mintAuthority = Keypair.fromSecretKey(Uint8Array.from(mintauth_privkey));
    const freezeAuthority = Keypair.fromSecretKey(Uint8Array.from(freezeauth_privkey));

    log(`Payer public key: ${payer.publicKey}`);
    log(`Token Holder public key: ${token_holder.publicKey}`);
    log(`mintAuthority public key: ${mintAuthority.publicKey}`);
    log(`freezeAuthority public key: ${freezeAuthority.publicKey}`);

    // STEP-1 Create MINT
    const mint = await createMint(
        connection,
        payer,
        mintAuthority.publicKey,
        freezeAuthority.publicKey,
        9,
        Keypair.generate(), {
            commitment: 'confirmed',
            maxRetries: 3
        }, 
        TOKEN_PROGRAM
    );
    // log(await connection.getAccountInfoAndContext(mint));

    // STEP-2 Get MINT info
    let mintInfo = await getMint(
        connection,
        mint,
        'confirmed',
        TOKEN_PROGRAM
    );
    log(`1) ----------------------------------------------------------------`);
    log(`spl_token_address address: ${mint}`);
    log(`mintInfo.address ${mintInfo.address.toBase58()}`);
    log(`mintInfo.mintAuthority ${mintInfo.mintAuthority.toBase58()}`);
    log(`mintInfo.freezeAuthority ${mintInfo.freezeAuthority.toBase58()}`);
    log(`mintInfo.supply ${mintInfo.supply}`);
    log(`mintInfo.decimals ${mintInfo.decimals}`);
    log(`mintInfo.isInitialized ${mintInfo.isInitialized}`);
    log();

    // STEP-3 Get/Create ATOKEN Account. (Manually doing what getOrCreateAssociatedTokenAccount would do)
    // Implementation taken from: node_modules/@solana/spl-token/src/actions/getOrCreateAssociatedTokenAccount.ts:30 (getOrCreateAssociatedTokenAccount(...))
    log(`2) ----------------------------------------------------------------`);
    const associatedToken = await getAssociatedTokenAddress(
        mint,
        token_holder.publicKey,
        true,
        TOKEN_PROGRAM,
        ATOKEN_PROGRAM
    );
    log(`getAssociatedTokenAddress: ${associatedToken}`);

    // STEP-3 Get/Create ATOKEN Account.
    log(`3) ----------------------------------------------------------------`);
    // try {
    //     const transaction = new Transaction().add(
    //         createAssociatedTokenAccountInstructionForked(
    //             payer.publicKey,
    //             associatedToken,
    //             token_holder.publicKey,
    //             mint,
    //             TOKEN_PROGRAM,
    //             ATOKEN_PROGRAM
    //         )
    //     );
    //     const res = await sendAndConfirmTransaction(
    //         connection,
    //         transaction,
    //         [payer],
            // {
            //     commitment: 'confirmed',
            //     maxRetries: 3
            // });
    //     log(res);
    // } catch (error) {
    //     log(`error: ${error}`);
    // }

    log(`4) ----------------------------------------------------------------`);

    // let accInfo = await connection.getAccountInfo(associatedToken, 'confirmed');
    // log(accInfo);
    // log(`${accInfo.owner}, ${TOKEN_PROGRAM}, ${accInfo.owner.equals(TOKEN_PROGRAM)}`);

    // let tokenAccountInfo = await getAccount(
    //     connection,
    //     associatedToken,
    //     'confirmed',
    //     TOKEN_PROGRAM);

    // log(tokenAccountInfo);

    log(`5) ----------------------------------------------------------------`);

    // STEP-3 Get/Create ATOKEN Account.
    log('getOrCreateAssociatedTokenAccount');

    let tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        payer.publicKey,
        false,
        'confirmed',
        {maxRetries: 3},
        TOKEN_PROGRAM,
        ATOKEN_PROGRAM
    );
    log();
    log(`tokenAccount.address ${tokenAccount.address.toBase58()}`);
    log(`tokenAccount.mint ${tokenAccount.mint.toBase58()}`);
    log(`tokenAccount.owner ${tokenAccount.owner.toBase58()}`);
    log(`tokenAccount.amount ${tokenAccount.amount}`);
    log();

    log(`6) ----------------------------------------------------------------`);
    // STEP-4 Get Atoken Account info
    log('tokenAccountInfo');

    let tokenAccountInfo = await getAccount(
        connection,
        tokenAccount.address,
        'confirmed',
        TOKEN_PROGRAM
    );
    log();
    log(`tokenAccountInfo.address ${tokenAccountInfo.address.toBase58()}`);
    log(`tokenAccountInfo.mint ${tokenAccountInfo.mint.toBase58()}`);
    log(`tokenAccountInfo.owner ${tokenAccountInfo.owner.toBase58()}`);
    log(`tokenAccountInfo.amount ${tokenAccountInfo.amount}`);
    log();

    log(`7) ----------------------------------------------------------------`);

    // STEP-5 Mint tokens and grant them to tokenAccount.address
    const mintToTxid = await mintTo(
        connection,
        payer,
        mint,
        tokenAccount.address,
        mintAuthority,
        100000000000,
        [],
        {commitment: 'confirmed', maxRetries: 3},
        TOKEN_PROGRAM
    );
    log(`mintoTxId: ${mintToTxid}`);

    log(`8) ----------------------------------------------------------------`);
    // STEP-6 Get Mint info and validate new supply of tokens

    mintInfo = await getMint(
        connection,
        mint,
        'confirmed',
        TOKEN_PROGRAM
    );
    log();
    log(`mintInfo.address ${mintInfo.address.toBase58()}`);
    log(`mintInfo.mintAuthority ${mintInfo.mintAuthority.toBase58()}`);
    log(`mintInfo.freezeAuthority ${mintInfo.freezeAuthority.toBase58()}`);
    log(`mintInfo.supply ${mintInfo.supply}`);
    log(`mintInfo.decimals ${mintInfo.decimals}`);
    log(`mintInfo.isInitialized ${mintInfo.isInitialized}`);
    log();

    log(`9) ----------------------------------------------------------------`);
    // // STEP-7 Get tokenAccount.address account info and validate new supply of tokens
    tokenAccountInfo = await getAccount(
        connection,
        tokenAccount.address,
        'confirmed',
        TOKEN_PROGRAM
    );
    log();
    log(`tokenAccountInfo.address ${tokenAccountInfo.address.toBase58()}`);
    log(`tokenAccountInfo.mint ${tokenAccountInfo.mint.toBase58()}`);
    log(`tokenAccountInfo.owner ${tokenAccountInfo.owner.toBase58()}`);
    log(`tokenAccountInfo.amount ${tokenAccountInfo.amount}`);
    log();


    let tokenAccountDest = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        freezeAuthority.publicKey,
        false,
        'confirmed',
        {maxRetries: 3},
        TOKEN_PROGRAM,
        ATOKEN_PROGRAM
    );
    log();
    log(`tokenAccountDest.address ${tokenAccountDest.address.toBase58()}`);
    log(tokenAccountDest.address);
    log(`tokenAccountDest.mint ${tokenAccountDest.mint.toBase58()}`);
    log(`tokenAccountDest.owner ${tokenAccountDest.owner.toBase58()}`);
    log(`tokenAccountDest.amount ${tokenAccountDest.amount}`);
    log();

    const transferTxId = await transfer(
        connection,
        payer,
        tokenAccount.address,
        tokenAccountDest.address,
        payer,
        1,
        [],
        'confirmed',
        TOKEN_PROGRAM
    );

    log(transferTxId);

    let txInfo = await connection.getParsedTransaction(transferTxId);
    log(txInfo);
    log(txInfo.meta.preTokenBalances);
    log(txInfo.meta.postTokenBalances);

    // let txRawData = await connection.getTransaction(transferTxId);
    // log(txRawData);
}

/**
 * ENTRYPOINT
 */
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
