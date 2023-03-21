# Blockchain Lottery

This is a proof of concept repository for a simple blockchain lottery that I created for a blog post I wrote [www.twistedbrackets.com/decentralised-lottery-with-blockchain/](www.twistedbrackets.com/decentralised-lottery-with-blockchain/). The lottery is designed to have a single draw and limited functionality, focusing on the creation and validation of entries in the blockchain. 

# Scope

To manage the scope for this proof of concept, we have defined some parameters we will work within:

* We will focus on a single lottery draw.
* We want to limit the ability to add entries to the blockchain to only authorised nodes but still allow the chain to propagate to other nodes for validation.
* We want to ensure that the valid owner of an entry can be proven.
* We will only focus on the initial purchase status, not allowing entries to be cancelled or prizes claimed.
* We will not add any complicated mechanics to manage race conditions across the network, simply rejecting a block if this edge case does eventuate.
* We will store our blockchain in a simple JSON object to be easily serialisable and only maintain it in memory.
* We will create a simple API to add view and validate ownership of enteries in our lottery.

We will tackle this in two parts:

* Create the classes to manage the blockchain data structure.
* Create a NodeJs express server to act as our blockchain nodes and manage block addition, validation and propagation. The server will use sockets to communicate with each other and a simple REST API to contribute to the chain. The socket connection in the proof of concept will be kept simple, not allowing for loss of connection and reconnection to the network.

# Usage

The script uses the Commander library to parse command-line arguments. The available options are:

-p, --port <port>: The port to run the BlockchainNode on. If not specified, the default value is 3000.

-h, --host <host>: The hostname or IP address of the node to connect to.

-v, --verbose <verbose>: Display detailed processing information. If not specified, the default value is false.

-k, --key <key>: Private key used to validate a new block added to the blockchain.

-s, --save <save>: Save the private key to file.