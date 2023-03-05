const { program } = require('commander');
const express = require('express');
const WebSocket = require('ws');
const BlockchainNode = require('./src/blockchain-node');

program
  .option('-p, --port <port>', 'The port to run the BlockchainNode on', parseInt)
  .option('-h, --host <host>', 'The hostname or IP address of the node to connect to');

program.parse(process.argv);

const options = program.opts();

const port = options.port || 3000;
const host = options.host || null;

const server = new BlockchainNode(port, host);

