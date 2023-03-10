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
    constructor({ port, host = 'localhost:3000', privateKey = null, verbose = false }) {
        // Keep track of the JSON object
        this.data = {};
        this.privateKey = privateKey;
        this.verbose = verbose;

        // If there is not upstream host, this server will become the master, so we need to setup the initial blockchain state. 
        if (!host) {
            // Create a private key. Only nodes with this key will be able to add to the blockchain

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

            // // Create keys
            // if(!this.privateKey){
            //     this.privateKey = new NodeRSA({b: 512});
            // }

            this.publicKey = this.privateKey.exportKey("public");

            // Create a new blockchain object
            this.data = new Blockchain(lottery, this.publicKey, this.privateKey);
        }

        // Create an Express app
        const app = express();

        // Serve the public folder
        app.use(express.static('public'));

        // ----- API Server

        // Middleware to parse JSON body
        app.use(express.json());

        app.post('/api/block', (req, res) => {
            const { name, numbers } = req.body;

            if (!name || !numbers) return res.status(400).send('Name and number fields are required');
            (this.verbose) ? console.log("New Block Request") : null;
            const newBlock = this.data.addBlock({ name, numbers });

            // Broadcast to other downstream clients, but ignore the initial client that sent the message.
            let message = new Message("add", newBlock.serialize())
            this.broadcast(message);

            if (this.upstream && this.upstream.OPEN) {
                this.upstream.send(message.toJSON());//update server connection
            }

            res.status(201).send(newBlock.serialize());
        });

        app.get('/api/block', (req, res) => {
            const { name, numbers } = req.body;

            res.status(200).send(this.data.serialize());
        });

        // Start the server
        this.server = app.listen(port, () => {
            console.log(`Server started on port ${port}`);
        });

        // ----- Downstream Server

        // Create a WebSocket server
        this.downstream = new WebSocket.Server({ server: this.server });

        // Handle WebSocket connections
        this.downstream.on('connection', socket => {
            console.log('new client connected');

            // Send the initial JSON object to the new client
            const message = new Message('sync', this.data.serialize());
            socket.send(message.toJSON());

            // Handle messages from the client
            socket.on('message', message => {

                // Update the JSON object and share if valid
                if (this.processMessage(message, socket)) {
                    // Broadcast to other downstream clients, but ignore the initial client that sent the message. 
                    let newMessage = Message.deserialize(JSON.parse(message));
                    this.broadcast(newMessage, socket);

                    if (this.upstream && this.upstream.OPEN) {
                        this.upstream.send(newMessage.toJSON());//update server connection
                    }
                }

            });

            // Handle disconnections
            socket.on('close', () => {
                console.log('a client disconected');
            });
        });


        // ----- Upstream Client

        // Setup Upstream connection
        if (host) {
            console.log(`connecting to host at ${host}`);
            // Connect to the server
            this.upstream = new WebSocket(`ws://${host}`);

            this.upstream.on('open', () => {
                console.log(`Connected to server at host ${host}`);
            });

            // Receive messages from the server
            this.upstream.on('message', message => {
                this.processMessage(message, this.upstream)

                let newMessage = Message.deserialize(JSON.parse(message));
                this.broadcast(newMessage);
            });
        }
    }

    // Setter for the current data object
    // set data(value) {
    //     this._data = value;
    //     this.broadcast();
    // }



    processMessage(message, socket = null) {
        let parsedMessage = JSON.parse(message);
        (this.verbose) ? console.log('Message received: ' + parsedMessage.type, parsedMessage.data) : null;

        switch (parsedMessage.type) {
            case 'add':
                const networkNode = Block.deserialize(parsedMessage.data);
                if (networkNode.isValidBlock(new NodeRSA(this.data.publicKey))) {
                    this.data.addBlockFromNetwork(networkNode);
                } else {
                    (this.verbose) ? console.log("Block Rejected") : null;
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

    publish(value) {
        (this.verbose) ? console.log('Data changed: ' + JSON.stringify(value)) : null;

        this.data = value;
        // Send a message to the server
        // this.upstream.send(JSON.stringify(this._data));
        // this.broadcast();
    }

    // Broadcast the current data object to all connected clients
    broadcast(message, socket = null) {
        const data = message.toJSON();

        this.downstream.clients.forEach(client => {
            if (socket !== client) { // ignore a particular client
                client.send(data);
            }
        });
    }
    // broadcast(socket = null) {
    //     this.downstream.clients.forEach(client => {
    //         if (socket !== client) { // ignore a particular client
    //             client.send(JSON.stringify(this.data));
    //         }
    //     });
    // }

}

module.exports = BlockchainNode;