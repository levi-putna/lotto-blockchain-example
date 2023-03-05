const { program } = require('commander');

const Blockchain = require("./src/blockchain");
const BlockchainNode = require("./src/blockchain-node");
const Lottery = require("./src/lottery");

program
  .option('-p, --port <port>', 'The port to run the BlockchainNode on', parseInt)
  .option('-h, --host <host>', 'The hostname or IP address of the node to connect to');

program.parse(process.argv);

const options = program.opts();

const port = options.port || 3000;
const host = options.host || 'localhost';

const node = new BlockchainNode(port);
node.start();

// console.log(`Running BlockchainNode on port ${port}, connecting to host ${host}`);

// // Create a new lottery
// const lottery = new  Lottery(
//     "Powerball",
//     123,
//     new Date("2023-01-01"),
//     new Date("2023-01-7"),
//     new Date("2023-01-8")
// );

// // Create a new blockchain object
// const blockchain = new Blockchain(lottery);

