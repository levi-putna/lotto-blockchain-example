const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const Lottery = require('./lottery');
const Blockchain = require('./blockchain');
const LotteryTicket = require('./lottery-ticket');
const Message = require('./Message');
const Block = require('./block');
const NodeRSA = require('node-rsa');
const fs = require('fs');

class BlockchainNode {

    /**
    * Creates a new instance of the client constructor.
    * @constructor
    * @param {object} options - The configuration options for the client.
    * @param {number} options.port - The port number to use for the connection.
    * @param {string} [options.host='localhost:3000'] - The host address for the connection. Defaults to 'localhost:3000' if not provided.
    * @param {string} [options.privateKey=null] - The private key to use for authentication. Defaults to null if not provided.
    * @param {boolean} [options.verbose=false] - Whether to enable verbose logging. Defaults to false if not provided.
    */
    constructor({ port, host = 'localhost', privateKey = null, verbose = false }) {
        this.data = {}; // The blockchain data of the node.
        this.privateKey = privateKey; // The private key of the node for authentication.
        this.verbose = verbose; // Whether to enable verbose logging.

        if (!host) {
            this._initializeBlockchain();
        } else {
            this._initializeUpstreamClient(host);
        }

        this._initializeApiServer(port);
        this._initializeDownstreamServer();
    }

    /**
     * 
     * Initializes the blockchain data of the node.
     * @private
     * */
    _initializeBlockchain() {
        const lottery = {
            lottery: "BlockLotto",
            draw: 1,
            creationDate: new Date(),
            prizePool: {
                value: 1000000,
                currency: "AUD"
            },
            rules: {
                description: "Each set of numbers on your ticket is made up of 6 numbers, which represents one game and gives you one chance to win a prize. Numbers will be between 1 and 45 inclusive. 6 winning numbers will be selected at random from the 45 to represent the winning numbers",
                divisions: {
                    1: "All 6 numbers",
                    2: "5 numbers",
                    3: "4 numbers",
                    4: "3 numbers",
                }
            },
        }

        if (!this.privateKey) {
            this.privateKey = new NodeRSA({ b: 512 });
        }

        this.publicKey = this.privateKey.exportKey("public");
        this.data = new Blockchain(lottery, this.publicKey, this.privateKey);
    }

    /**
     * Initializes the API server of the node.
     * 
     * @param {number} port - The port number to use for the API server.
     * @private
     * */
    _initializeApiServer(port) {
        const app = express();

        app.use(express.static('public'));
        app.use(express.json());

        /*
        Add a new block to the blockchain.
        @name POST /api/block
        @function
        @param {object} req - The request object.
        @param {object} res - The response object.
        @param {string} req.body.name - The name of the block owner.
        @param {Array} req.body.numbers - An array of numbers chosen by the block owner.
        */
        app.post('/api/block', (req, res) => {
            const { name, numbers } = req.body;

            if (!name || !numbers) return res.status(400).send('Name and number fields are required');

            // Key used to verify ownership of this block
            const key = new NodeRSA({ b: 512 });
            const newBlock = this.data.addBlock({ name, numbers }, key);

            let message = new Message("add", newBlock.serialize())
            this.broadcast(message);

            if (this.upstream && this.upstream.OPEN) {
                this.upstream.send(message.toJSON());
            }

            // Serialize private key
            const privateKeySerialized = key.exportKey('pkcs8-private-pem');

            res.status(201).send({ key: privateKeySerialized, hash: newBlock.hash });
        });

        app.get('/api/block', (req, res) => {
            res.status(200).send(this.data.serialize());
        });

        app.post('/api/block/owner', (req, res) => {
            const { hash, key } = req.body;

            // Deserialize private key
            let deserializedKey;
            try {
                deserializedKey = new NodeRSA(key);
              } catch (error) {
                res.status(200).send({
                    owner:false
                });
                return false;
              }

            const block = this.data.chain.find(block => block.hash === hash);
            const owner = (block) ? block.verifiedOwner(deserializedKey) : false;

            res.status(200).send({
                owner:owner
            });
        });

        this.server = app.listen(port, () => {
            console.log(`server started on port ${port}`);
        });
    }

    /**
     * Initialize the WebSocket server to communicate with downstream clients.
     * 
     * It creates a new WebSocket server instance, binds it to the provided HTTP server,
     * and registers event handlers for client connections, messages, and disconnections.
     * On connection, a synchronization message containing the current data state is sent to the client.
     * On message, the received message is processed, broadcasted to all connected clients (except sender),
     * and forwarded to the upstream server if available and open.
     * On disconnection, the client is logged as disconnected.
     * */
    _initializeDownstreamServer() {
        this.downstream = new WebSocket.Server({ server: this.server });

        this.downstream.on('connection', socket => {
            console.log('new client connected');

            const message = new Message('sync', this.data.serialize());
            socket.send(message.toJSON());

            socket.on('message', message => {
                if (this.processMessage(message, socket)) {
                    let newMessage = Message.deserialize(JSON.parse(message));
                    this.broadcast(newMessage, socket);

                    if (this.upstream && this.upstream.OPEN) {
                        this.upstream.send(newMessage.toJSON());
                    }
                }
            });

            socket.on('close', () => {
                console.log('a client disconected');
            });
        });
    }

    /**
     * Initializes the WebSocket client that connects to the upstream server
     * 
     * @param {string} host - The host address to connect to
     * @throws {Error} If the provided host address is not a string or is empty
     * @return {void}
     */
    _initializeUpstreamClient(host) {
        console.log(`connecting to host at ${host}`);

        // Connect to the server
        this.upstream = new WebSocket(`ws://${host}`);

        this.upstream.on('open', () => {
            console.log(`Connected to server at host ${host}`);
        });

        // Receive messages from the server
        this.upstream.on('message', (message) => {
            this.processMessage(message, this.upstream);

            let newMessage = Message.deserialize(JSON.parse(message));
            this.broadcast(newMessage);
        });
    }


    /**
     * Process a message received from a network node.
     * 
     *  @param {string} message - The message received from the network.
     * @param {object} socket - The socket object the message was received from, used to send messages back to the node if needed. Defaults to null.
     * @returns {boolean} - Returns true if the message was successfully processed, false otherwise.
    */
    processMessage(message, socket = null) {
        let parsedMessage = JSON.parse(message);
        (this.verbose) ? console.log('Message received: ' + parsedMessage.type, parsedMessage.data) : null;

        switch (parsedMessage.type) {
            case 'add':
                const networkNode = Block.deserialize(parsedMessage.data);
                if (networkNode.isValidBlock(new NodeRSA(this.data.publicKey))) {
                    this.data.addBlockFromNetwork(networkNode);
                } else {
                    (this.verbose) ? console.log("Invalid block rejected") : null;
                    let newMessage = new Message('reject', parsedMessage.data);
                    socket.send(newMessage.toJSON());//send a message back about the invalid
                    return false;
                }

                break;
            case 'sync':
                const networkBlockchain = Blockchain.deserialize(parsedMessage.data);
                networkBlockchain.privateKey = this.privateKey; // We need to add the local private key back in, it is not serialize
                this.data = networkBlockchain;
                break;
            case 'reject':
                const badNode = Block.deserialize(parsedMessage.data);
                const { hash } = badNode;
                (this.verbose) ? console.log("rejected block received " + hash) : null;

                let removeBlock = this.data.removeBlock(hash);
                break;
            default:
                console.error('Invalid message type received:', parsedMessage.type);
                return false;
                break;
        }
        return true;
    }

    /**
     * Publish a new value to the blockchain data store.
     * 
     * @param {*} value 
     */
    publish(value) {
        (this.verbose) ? console.log('Data changed: ' + JSON.stringify(value)) : null;

        this.data = value;
    }

    /**
     * Broadcast the current data object to all connected clients
     * 
     * This function takes in a message object and a socket object (optional) and broadcasts the message to all clients except the provided socket.
     * @param {Message} message - A message object to broadcast
     * @param {WebSocket|null} socket - A socket object to exclude from broadcasting (optional)
     * @returns {void} 
    */
    broadcast(message, socket = null) {
        const data = message.toJSON();

        this.downstream.clients.forEach(client => {
            if (socket !== client) { // ignore a particular client
                client.send(data);
            }
        });
    }


}

module.exports = BlockchainNode;