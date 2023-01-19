const prompt = require('prompt-sync')({ sigint: true });
const {
    Connection,
    PublicKey,
    Keypair,
    LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const bip39 = require('bip39');
const yaml = require('js-yaml');
const fs = require('fs');
const homedir = require('os').homedir();
const { 
    isValidHttpUrl 
} = require('./utils.js');
const crypto = require('crypto');
const clipboardy = require('clipboardy');
const wbold = require('chalk').white.bold;
const g = require('chalk').green;
const log = console.log;

/**
 * Request a y/n input from the user
 * @param {*} message 
 * @returns 
 */
const confirmAction = (message) => {
    let answer = '';
    while (!(answer == 'y' || answer == 'n')) {
        answer = prompt(wbold(`✋🚦 ${message} 🚦🤚 (y/n): `)).toLowerCase().trim();
    }
    return answer == 'y';
}

/**
 * Generates a 32 bytes of entropy unless the user specifies that 
 * She/He wants to provide it's own
 * @returns 
 */
const getEntropy = () => {
    let answer = '';
    while (!(answer == 'y' || answer == 'n')) {
        answer = prompt(wbold('✋🚦 Want to use your own entropy? 🚦🤚 (y/n): ')).toLowerCase().trim();
    }
    let entropy = '';
    hexStrRegex = /[0-9A-Fa-f]{64}/g;
    if (answer == 'y') {
        while (!hexStrRegex.test(entropy)) {
            entropy = prompt(wbold('Please enter a 64 character length hex string: '));
        }
    } else {
        entropy = crypto.randomBytes(32).toString('hex');
        log(g(`📢 Randomly generated entropy: ${entropy}`));
    }
    clipboardy.writeSync('');
    return entropy;
}

/**
 * Request a valid mnemonic from the user
 * @returns 
 */
const getMnemonic = () => {
    let mnemonic = '';
    while (!bip39.validateMnemonic(mnemonic)) {
        mnemonic = prompt(wbold('Please enter a valid mnemonic: ')).trim();
    }
    clipboardy.writeSync('');
    return mnemonic;
}

/**
 * Returns a mnemonic string from a textfile
 * @param {*} filepath 
 * @returns 
 */
const getMnemonicFromFile = filepath => {
    return fs.readFileSync(filepath, 'utf8').trim().replace(/(\r\n|\n|\r)/gm, "");
}

/**
 * Requests a PublicKey from the user
 * @param {*} message 
 * @returns 
 */
const getPublicKey = message => {
    let pubKey = '';
    while (pubKey.length == 0) {
        pubKey = prompt(wbold(message)).trim();
    }
    return new PublicKey(pubKey);
}

/**
 * Request an integer number from the user
 * @returns 
 */
const getInteger = (message, max) => {
    let n = 0;
    while (n.toString() == 'NaN' || n == 0 || n > max) {
        n = prompt(wbold(message));
        n = Number.parseInt(n);
    }
    return n;
}

/**
 * Displays a numbered list and request the user
 * to provide the corresponding number of the 
 * item She/He wants
 * @param {*} list 
 * @param {*} message 
 */
const pickFromList = (list, message) => {
    log();
    list.forEach((item, idx) => log(`(${idx+1}) ${item}`));
    return list[getInteger(message, list.length+1) - 1];
}

/**
 * Returns the user's selected voter
 * @param {*} connection 
 * @returns 
 */
const getVoter = async connection => {
    let voteAccounts = await connection.getVoteAccounts();
    let votersList = new Array();
    for (let voter of voteAccounts.current) { votersList.push(voter.votePubkey); }
    let selection = pickFromList(votersList, 'Please select the validator you wish to delegate to: ');
    log(`Selected voter: ${selection}`);
    return new PublicKey(selection);
}

/**
 * Returns voter object from user provided public key
 * @param {*} connection 
 * @param {*} voterPubKey 
 * @returns 
 */
const getVoterFromPubKey = async (connection, voterPubKey) => {
    let voteAccounts = await connection.getVoteAccounts();
    for (let voter of voteAccounts.current) {
        if (voter.votePubkey === voterPubKey)
            return new PublicKey(voter.votePubkey);
    }
    return undefined;
}

/**
 * Returns the number of native tokens to be transferred to each derived account
 * @returns 
 */
const getFundingAmount = () => {
    let fundingAmount = 0;
    while (fundingAmount == 0 || fundingAmount > 100000000) {
        fundingAmount = prompt(wbold('Please enter the amount of Solstice to be sent to each account (max 100,000,000): '));
        fundingAmount = Number.parseInt(fundingAmount);
    }
    return fundingAmount*LAMPORTS_PER_SOL;
}

/**
 * Attempts to load solana default config file
 * @returns 
 */
const loadSolanaDefaultConfig = () => {
    let config = undefined;
    try {
        config = yaml.load(fs.readFileSync(`${homedir}/.config/solana/cli/config.yml`, 'utf8'));
    } catch (err) {
        log(err);
    }
    return config;
}

/**
 * Opens a connection with a solana cluster
 * @returns 
 */
const getClusterConnection = (url = 'https://plbapi.testnet.powerledger.io') => {
// const getClusterConnection = (url = 'https://plb-api.mainnet.powerledger.io') => {
    // let solanaConfig = loadSolanaDefaultConfig();
    // let endpoint = '';
    // if (solanaConfig == undefined) {
    //     log(wbold(`⚠️ Couldn't find solana config.yml file, please provide an endpoint for the solana cluster.`));
    //     while (!isValidHttpUrl(endpoint)) {
    //         endpoint = prompt(wbold('Please provide a solana cluster endpoint: '));
    //     }
    // } else {
    //     log(wbold(`📢 Using default endpoint: ${solanaConfig.json_rpc_url}`));
    //     endpoint = solanaConfig.json_rpc_url;
    // }
    // return new Connection(endpoint, 'recent');

    // 'https://plbapi.testnet.powerledger.io'
    // 'https://api.devnet.solana.com'
    return new Connection(url, 'confirmed');
}

/**
 * Returns the keypair that is going to be used for bulk funding
 * @returns 
 */
const getFundsKeypair = () => {
    let fundsKeyPair;
    let validKey = false;
    while (!validKey) {
        let fundsKeyPairPath = prompt(wbold('Please enter the path to the keypair of the wallet with the source of funds: '));
        let data = JSON.parse(fs.readFileSync(fundsKeyPairPath, 'utf8'));
        fundsKeyPair = Keypair.fromSecretKey(Uint8Array.from(data));
        validKey = true;
    }
    log(wbold(`📢 Keypair with public key ${fundsKeyPair.publicKey.toBase58()} loaded.`));
    return fundsKeyPair;
}

/**
 * Returns the keypair that is going to be used for bulk funding
 * @param {*} filepath 
 * @returns 
 */
const getFundsKeypairFromFile = filepath => {
    let data = JSON.parse(fs.readFileSync(fs.realpathSync(filepath, 'utf8'), 'utf8'));
    let fundsKeyPair = Keypair.fromSecretKey(Uint8Array.from(data));
    log(wbold(`📢 Keypair with public key ${fundsKeyPair.publicKey.toBase58()} loaded.`));
    return fundsKeyPair;
}

module.exports = {
    confirmAction,
    getMnemonic,
    getMnemonicFromFile,
    getPublicKey,
    getInteger,
    getVoter,
    getVoterFromPubKey,
    getFundingAmount,
    getClusterConnection,
    getFundsKeypair,
    getFundsKeypairFromFile,
    getEntropy
}
