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

    constructor(port, host = 'localhost:3000', privateKey = null) {

        // Keep track of the JSON object
        this.data = {};
        this.privateKey = privateKey;

        // If there is not upstream host, this server will become the master, so we need to setup the initial blockchain state. 
        if (!host) {
            // Create a private key. Only nodes with this key will be able to add to the blockchain
            
            const lottery = {
                lottery: "BlockLotto",
                draw:1,
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

            // Create keys
            if(!this.privateKey){
                this.privateKey = new NodeRSA({b: 512});
            }
            
            const publicKey = this.privateKey.exportKey("public");
            // Log out key to be saved
            console.log(this.privateKey.exportKey('pkcs8-private-pem'));
            // Save the private key to a file in PKCS#8-encoded PEM format
            fs.writeFileSync('private_key.pem', this.privateKey.exportKey('pkcs8-private-pem'));

            // Create a new blockchain object
            this.data = new Blockchain(lottery, publicKey, this.privateKey);
        }

        // Create an Express app
        const app = express();

        // Serve the public folder
        app.use(express.static('public'));

        // ----- API Server

        // Middleware to parse JSON body
        app.use(express.json());

        app.post('/api/lottery', (req, res) => {
            const { name, numbers } = req.body;

            if (!name || !numbers) return res.status(400).send('Name and number fields are required');


            const newBlock = this.data.addBlock({ name, numbers });

            // Broadcast to other downstream clients, but ignore the initial client that sent the message.
            let message = new Message("add", newBlock.serialize())
            this.broadcast(message);


            if (this.upstream && this.upstream.OPEN) {
                this.upstream.send(message.toJSON());//update server connection
            }

            res.status(201).send(newBlock.serialize());
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

                // Update the JSON object
                this.processMessage(message)

                // Broadcast to other downstream clients, but ignore the initial client that sent the message. 
                let newMessage = Message.deserialize(JSON.parse(message));
                this.broadcast(newMessage, socket);

                if (this.upstream && this.upstream.OPEN) {
                    this.upstream.send(newMessage.toJSON());//update server connection
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
                this.processMessage(message)

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

    processMessage(message) {
        let parsedMessage = JSON.parse(message);
        console.log('Message received: ' + parsedMessage.type, parsedMessage.data);

        switch (parsedMessage.type) {
            case 'add':
                const networkNode = Block.deserialize(parsedMessage.data);
                this.data.addBlockFromNetwork(networkNode);
                break;
            case 'sync':
                const networkBlockchain = Blockchain.deserialize(parsedMessage.data);
                this.data = networkBlockchain;
                break;
            case 'reject':
                const badNode = Block.deserialize(parsedMessage.data);
                // TODO return to the original socket with a fail message
                break;
            default:
                console.error('Invalid message type received:', parsedMessage.type);
                break;
        }
    }

    publish(value) {
        (verbose) ? console.log('Data changed: ' + JSON.stringify(value)) : null;

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