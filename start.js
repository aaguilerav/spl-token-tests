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
const TOKEN_PROGRAM = new PublicKey('TokeRNc22SySPXzDxhu4geGyqsXqv8MHutdMq3MAn7Q');
const ATOKEN_PROGRAM = new PublicKey('ATokLqXRe9wAGn9cTACPHewKB5LkhTu8WvcbPivLVNBA');

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
    log();
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
    const associatedToken = await getAssociatedTokenAddress(
        mint,
        token_holder.publicKey,
        true,
        TOKEN_PROGRAM,
        ATOKEN_PROGRAM
    );

    log(`getAssociatedTokenAddress: ${associatedToken}`);

    try {
        const transaction = new Transaction().add(
            createAssociatedTokenAccountInstructionForked(
                payer.publicKey,
                associatedToken,
                token_holder.publicKey,
                mint,
                TOKEN_PROGRAM,
                ATOKEN_PROGRAM
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
    log(`getAccountInfo: ${await connection.getAccountInfo(associatedToken, 'confirmed')}`);

    // STEP-3 Get/Create ATOKEN Account.
    // log('getOrCreateAssociatedTokenAccount');
    // let tokenAccount = await getOrCreateAssociatedTokenAccount(
    //     connection,
    //     payer,
    //     mint,
    //     payer.publicKey,
    //     TOKEN_PROGRAM,
    //     ATOKEN_PROGRAM
    // );
    // log();
    // log(`tokenAccount.address ${tokenAccount.address.toBase58()}`);
    // log(`tokenAccount.mint ${tokenAccount.mint.toBase58()}`);
    // log(`tokenAccount.owner ${tokenAccount.owner.toBase58()}`);
    // log(`tokenAccount.amount ${tokenAccount.amount}`);
    // log();

    // STEP-4 Get Atoken Account info
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

    // STEP-5 Mint tokens and grant them to tokenAccount.address
    // await mintTo(
    //     connection,
    //     payer,
    //     mint,
    //     tokenAccount.address,
    //     mintAuthority,
    //     100000000000 // because decimals for the mint are set to 9 
    // );

    // STEP-6 Get Mint info and validate new supply of tokens
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

    // STEP-7 Get tokenAccount.address account info and validate new supply of tokens
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
