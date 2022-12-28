const nacl = require('tweetnacl');
const {
    SystemProgram,
    StakeProgram,
    Transaction,
    sendAndConfirmTransaction,
    Keypair,
    Authorized,
    Lockup,
    LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const { derivePath } = require('ed25519-hd-key');
const bip39 = require('bip39');
const ora = require('ora');
const spinner = ora({ text: '' });

/**
 * Request Airdrop
 * @param {Connection} connection 
 * @param {PublicKey} beneficiary
 */
const requestAirdrop = async (connection, beneficiary) => {
    // const beneficiary = Keypair.fromSecretKey(Uint8Array.from(beneficiary_privkey));
    const airdropSignature = await connection.requestAirdrop(
        beneficiary,
        LAMPORTS_PER_SOL,
    );
    return airdropSignature;
}

/**
 * Based on a source of entropy, generates a mnemonic phrase and the corresponding seed 
 * @param {*} entropy 
 * @returns { seed phrase, seed }
 */
const generateMnemonicAndSeed = async (entropy) => {
    const mnemonic = bip39.entropyToMnemonic(entropy);
    const seed = await bip39.mnemonicToSeed(mnemonic);
    return { mnemonic, seed: Buffer.from(seed).toString('hex') };
}

/**
 * Generates the seed that corresponds to the provided mnemonic phrase
 * @param {*} mnemonic 
 * @returns seed
 */
const generateSeedFromMnemonic = async (mnemonic) => {
    return Buffer.from(await bip39.mnemonicToSeed(mnemonic));
}

/**
 * From the seed that is generated from the seed phrase, 
 * and a derivation path (m/44'/501'/idx' or [m/44'/501'/0'/idx')
 * a Keypair is generated
 * @param {*} seed 
 * @param {*} walletIndex 
 * @returns Keypair
 */
const getAccountFromSeed = (path, seed) => {
    // https://docs.solana.com/wallet-guide/paper-wallet#hierarchical-derivation
    return Keypair.fromSecretKey((new Keypair(
        nacl.sign.keyPair.fromSeed(
            derivePath(path, seed).key
        ).secretKey
    ))._keypair);
}

/**
 * Performs solana native token transfers
 * @param {*} connection 
 * @param {*} fromPubkey 
 * @param {*} toPubkey 
 * @param {*} amount 
 * @returns Transaction
 */
const nativeTransfer = async (connection, signer, fromPubkey, toPubkey, amount) => {
    const tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: fromPubkey,
            toPubkey: toPubkey,
            lamports: amount,
        }),
    );
    return await sendAndConfirmTransaction(connection, tx, [signer]);
}

/**
 * Returns a single account
 * @param {*} seedBuffer 
 * @param {*} idx 
 * @returns json of main and alternative keypairs
 */
 const getSingleAccountFromSeedSpinner = (seedBuffer, idx) => {
    return {
        main: getAccountFromSeed(`m/44'/501'/${idx}'`, seedBuffer),
        alt: getAccountFromSeed(`m/44'/501'/0'/${idx}'`, seedBuffer)
    };
}

/**
 * Returns a list of accounts based on the same seed phrase
 * @param {*} seedBuffer 
 * @param {*} idx 
 * @returns json of main and alternative keypairs
 */
 const getSingleAccountFromSeed = (seedBuffer, idx) => {
    spinner.start(`⚙️ Creating account ...`);
    let result = getSingleAccountFromSeedSpinner(seedBuffer, idx);
    spinner.succeed();
    return result;
}

/**
 * Returns a list of accounts based on the same seed phrase
 * @param {*} seedBuffer 
 * @param {*} maxAccounts 
 * @returns Array of main and alternative Keypairs
 */
const getAccountsFromSeedSpinner = (seedBuffer, maxAccounts) => {
    return [...Array(maxAccounts).keys()].map(idx => {
        return getSingleAccountFromSeedSpinner(seedBuffer, idx);
    });
    // return [...Array(maxAccounts).keys()].map(idx => {
    //     return {
    //         main: getAccountFromSeed(`m/44'/501'/${idx}'`, seedBuffer),
    //         alt: getAccountFromSeed(`m/44'/501'/0'/${idx}'`, seedBuffer)
    //     };
    // });
}

/**
 * Returns a list of accounts based on the same seed phrase
 * @param {*} seedBuffer 
 * @param {*} maxAccounts 
 * @returns Array of main and alternative Keypairs
 */
const getAccountsFromSeed = (seedBuffer, maxAccounts) => {
    spinner.start(`⚙️ Creating ${maxAccounts} accounts ...`);
    let result = getAccountsFromSeedSpinner(seedBuffer, maxAccounts);
    spinner.succeed();
    return result;
}

/**
 * Creates a Stake account
 * @param {*} connection 
 * @param {*} fromAccount 
 * @param {*} stakeAccount 
 * @param {*} amount 
 * @returns Transaction
 */
const createStakeAccount = async (connection, fromAccount, stakeAccount, amount) => {
    let createAccountTx = StakeProgram.createAccount({
        fromPubkey: fromAccount.publicKey,
        authorized: new Authorized(fromAccount.publicKey, fromAccount.publicKey),
        lamports: amount,
        lockup: new Lockup(0, 0, fromAccount.publicKey),
        stakePubkey: stakeAccount.publicKey
    });
    return await sendAndConfirmTransaction(connection, createAccountTx, [fromAccount, stakeAccount]);
}

/**
 * Delegates native tokens to a selected Validator
 * @param {*} connection 
 * @param {*} fromAccount 
 * @param {*} stakeAccount 
 * @param {*} votePubkey 
 * @returns 
 */
const delegateStake = async (connection, fromAccount, stakeAccount, votePubkey) => {
    let delegateTx = StakeProgram.delegate({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: fromAccount.publicKey,
        votePubkey: votePubkey,
    });
    return await sendAndConfirmTransaction(connection, delegateTx, [fromAccount, fromAccount]);
}

/**
 * 
 * @param {*} connection 
 * @param {*} fromAccount 
 * @param {*} stakeAccount 
 */
const deactivateStake = async (connection, fromAccount, stakeAccount) => {
    let deactivateTx = StakeProgram.deactivate({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: fromAccount.publicKey,
    });
    return await sendAndConfirmTransaction(connection, deactivateTx, [fromAccount, fromAccount]);
}

/**
 * Withdraws native tokens from already deactivated stake account
 * @param {*} connection 
 * @param {*} fromAccount 
 * @param {*} stakeAccount 
 */
const withdrawStake = async (connection, fromAccount, stakeAccount) => {
    let stakeBalance = await connection.getBalance(stakeAccount.publicKey);
    let withdrawTx = StakeProgram.withdraw({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: fromAccount.publicKey,
        toPubkey: fromAccount.publicKey,
        lamports: stakeBalance,
    });
    await sendAndConfirmTransaction(connection, withdrawTx, [fromAccount, fromAccount]);
}

/**
 * TODO: Debugging ...
 * Withdraws native tokens from already deactivated stake account
 * @param {*} connection 
 * @param {*} fromAccount 
 * @param {*} stakeAccount 
 * @param {*} destinationAccount 
 */
const withdrawStakeTo = async (connection, fromAccount, stakeAccount, destinationAccount) => {
    let stakeBalance = await connection.getBalance(stakeAccount.publicKey);
    let withdrawTx = StakeProgram.withdraw({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: fromAccount.publicKey,
        toPubkey: destinationAccount.publicKey,
        lamports: stakeBalance,
    });
    await sendAndConfirmTransaction(connection, withdrawTx, [fromAccount, fromAccount]);
}

module.exports = {
    generateMnemonicAndSeed,
    generateSeedFromMnemonic,
    getAccountsFromSeed,
    getSingleAccountFromSeed,
    nativeTransfer,
    createStakeAccount,
    delegateStake,
    deactivateStake,
    withdrawStake,
    withdrawStakeTo,
    requestAirdrop
}
