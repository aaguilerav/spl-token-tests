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

// Implementation taken from: node_modules/@solana/spl-token/src/instructions/associatedTokenAccount.ts:17
const buildAssociatedTokenAccountInstruction = (
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
const createAssociatedTokenAccountInstruction = (
    payer,
    associatedToken,
    owner,
    mint,
    programId,
    associatedTokenProgramId
) => {
    return buildAssociatedTokenAccountInstruction(
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
        new PublicKey('AgUtAD21hh5zdPLH5DzT3b6ZzhXzxEsDNadExmkbnWC9') // spl-token-program deployed
    );

    log(await connection.getAccountInfoAndContext(mint));

    // STEP-2 Get MINT info
    let mintInfo = await getMint(
        connection,
        mint,
        'confirmed',
        new PublicKey('AgUtAD21hh5zdPLH5DzT3b6ZzhXzxEsDNadExmkbnWC9') // spl-token-program deployed
    );
    log();
    log(`spl_token_address address: ${mint}`);
    log(`mintInfo.address ${mintInfo.address.toBase58()}`);
    log(`mintInfo.mintAuthority ${mintInfo.mintAuthority.toBase58()}`);
    log(`mintInfo.freezeAuthority ${mintInfo.freezeAuthority.toBase58()}`);
    log(`mintInfo.supply ${mintInfo.supply}`);
    log(`mintInfo.decimals ${mintInfo.decimals}`);
    log(`mintInfo.isInitialized ${mintInfo.isInitialized}`);
    log();

    // STEP-3 Get ATOKEN Account
    let associatedToken = await getAssociatedTokenAddress(
        mint,
        token_holder.publicKey,
        false,
        new PublicKey('AgUtAD21hh5zdPLH5DzT3b6ZzhXzxEsDNadExmkbnWC9'), // spl-token-program deployed
        new PublicKey('F4FqftQs5rqS244XDFvSdFumFsTUT7zATN3EVHSmSdYn')  // AToken program deployed
    );
    log(`getAssociatedTokenAddress: ${associatedToken}`);
    log(`getAccountInfo: ${await connection.getAccountInfo(associatedToken, 'confirmed')}`);

    // STEP-4 Get/Create ATOKEN Account.
    // log('getOrCreateAssociatedTokenAccount');
    // let tokenAccount = await getOrCreateAssociatedTokenAccount(
    //     connection,
    //     payer,
    //     mint,
    //     payer.publicKey,
    //     new PublicKey('AgUtAD21hh5zdPLH5DzT3b6ZzhXzxEsDNadExmkbnWC9'), // Token
    //     new PublicKey('F4FqftQs5rqS244XDFvSdFumFsTUT7zATN3EVHSmSdYn')  // AToken
    // );
    // log();
    // log(`tokenAccount.address ${tokenAccount.address.toBase58()}`);
    // log(`tokenAccount.mint ${tokenAccount.mint.toBase58()}`);
    // log(`tokenAccount.owner ${tokenAccount.owner.toBase58()}`);
    // log(`tokenAccount.amount ${tokenAccount.amount}`);
    // log();

    // STEP-4 Get/Create ATOKEN Account. (Manually doing what getOrCreateAssociatedTokenAccount would do)
    // Implementation taken from: node_modules/@solana/spl-token/src/actions/getOrCreateAssociatedTokenAccount.ts:30 (getOrCreateAssociatedTokenAccount(...))
    try {
        const transaction = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                payer.publicKey,
                associatedToken,
                token_holder.publicKey,
                mint,
                new PublicKey('AgUtAD21hh5zdPLH5DzT3b6ZzhXzxEsDNadExmkbnWC9'), // spl-token-program deployed on pl-solana-testnet
                new PublicKey('F4FqftQs5rqS244XDFvSdFumFsTUT7zATN3EVHSmSdYn')  // AToken program deployed on pl-solana-testnet
            )
        );

        await sendAndConfirmTransaction(
            connection,
            transaction,
            [payer],
            {
                commitment: 'confirmed',
                maxRetries: 3
            });
    } catch (error) {
        log(`error: ${error}`);
    }

    // STEP-5 Get Atoken Account info
    // log('tokenAccountInfo');
    // let tokenAccountInfo = await getAccount(
    //     connection,
    //     tokenAccount.address
    // );
    // log();
    // log(`tokenAccountInfo.address ${tokenAccountInfo.address.toBase58()}`);
    // log(`tokenAccountInfo.mint ${tokenAccountInfo.mint.toBase58()}`);
    // log(`tokenAccountInfo.owner ${tokenAccountInfo.owner.toBase58()}`);
    // log(`tokenAccountInfo.amount ${tokenAccountInfo.amount}`);
    // log();

    // STEP-6 Mint tokens and grant them to tokenAccount.address
    // await mintTo(
    //     connection,
    //     payer,
    //     mint,
    //     tokenAccount.address,
    //     mintAuthority,
    //     100000000000 // because decimals for the mint are set to 9 
    // );

    // STEP-7 Get Mint info and validate new supply of tokens
    // mintInfo = await getMint(
    //     connection,
    //     mint
    // );
    // log();
    // log(`mintInfo.address ${mintInfo.address.toBase58()}`);
    // log(`mintInfo.mintAuthority ${mintInfo.mintAuthority.toBase58()}`);
    // log(`mintInfo.freezeAuthority ${mintInfo.freezeAuthority.toBase58()}`);
    // log(`mintInfo.supply ${mintInfo.supply}`);
    // log(`mintInfo.decimals ${mintInfo.decimals}`);
    // log(`mintInfo.isInitialized ${mintInfo.isInitialized}`);
    // log();

    // STEP-8 Get tokenAccount.address account info and validate new supply of tokens
    // tokenAccountInfo = await getAccount(
    //     connection,
    //     tokenAccount.address
    // );
    // log();
    // log(`tokenAccountInfo.address ${tokenAccountInfo.address.toBase58()}`);
    // log(`tokenAccountInfo.mint ${tokenAccountInfo.mint.toBase58()}`);
    // log(`tokenAccountInfo.owner ${tokenAccountInfo.owner.toBase58()}`);
    // log(`tokenAccountInfo.amount ${tokenAccountInfo.amount}`);
    // log();
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
