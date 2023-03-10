const { program } = require('commander');
const express = require('express');
const WebSocket = require('ws');
const BlockchainNode = require('./src/blockchain-node');
const NodeRSA = require('node-rsa');
const fs = require('fs');

program
    .option('-p, --port <port>', 'The port to run the BlockchainNode on', parseInt)
    .option('-h, --host <host>', 'The hostname or IP address of the node to connect to')
    .option('-v, --verbose <verbose>', 'Display detailed processing information')
    .option('-k, --key <key>', 'private key used to validate an new block added to the blockchain')
    .option('-s, --save <save>', 'Save the private key to file');

program.parse(process.argv);

const options = program.opts();

const port = options.port || 3000;
const host = options.host || null;
const verbose = options.verbose || false;
const key = options.key || null;
const save = options.save || null;

let privateKey = null;

// Load the private key from a file in PKCS#8-encoded PEM format
if (key) {
    const privateKeyPEM = fs.readFileSync(key, 'utf8');

    // Create a new NodeRSA object from the private key
    privateKey = new NodeRSA(privateKeyPEM);
} else {
    privateKey = new NodeRSA({ b: 512 });

    if (save) {
        // Log out key to be saved
        console.log(privateKey.exportKey('pkcs8-private-pem'));
        // Save the private key to a file in PKCS#8-encoded PEM format
        fs.writeFileSync('private_key.pem', privateKey.exportKey('pkcs8-private-pem'));
    }
}

const server = new BlockchainNode({ port:port, host:host, privateKey:privateKey, verbose:verbose });

