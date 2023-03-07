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
  .option('-k, --key <key>', 'private key used to validate an new block added to the blockchain');

program.parse(process.argv);

const options = program.opts();

const port = options.port || 3000;
const host = options.host || null;
const verbose = options.verbose || false;
const key = options.key || null;

let privateKey = null;

if(key){
    // Load the private key from a file in PKCS#8-encoded PEM format
    const privateKeyPEM = fs.readFileSync(key, 'utf8');

    // Create a new NodeRSA object from the private key
    privateKey = new NodeRSA(privateKeyPEM);
}

const server = new BlockchainNode(port, host, privateKey );

