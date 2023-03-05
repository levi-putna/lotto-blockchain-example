const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const Lottery = require('./lottery');
const Blockchain = require('./blockchain');
const LotteryTicket = require('./lottery-ticket');
const Message = require('./Message');

class BlockchainNode {

    constructor(port, host = 'localhost:3000') {

        // Keep track of the JSON object
        this.data = {};

        if(!host) {
            // create a new lottery
            const lottery = new Lottery(
                "Powerball",
                123,
                new Date("2023-01-01"),
                new Date("2023-01-7"),
                new Date("2023-01-8")
            );

            // Create a new blockchain object
            this.data = new Blockchain(lottery);
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
            

            // Update the JSON object
            //this.publish(book);

            // Broadcast to other downstream clients, but ignore the initial client that sent the message. 
            this.broadcast();

            const ticket = new LotteryTicket( name, numbers);
            const block = this.data.addTicket(ticket);


            if (this.upstream && this.upstream.OPEN) {
                this.upstream.send(JSON.stringify(this.data));//update server connection
            }

            //res.send(book);
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
            socket.send(JSON.stringify(this.data));

            // Handle messages from the client
            socket.on('message', message => {

                // Update the JSON object
                this.publish(JSON.parse(message));

                // Broadcast to other downstream clients, but ignore the initial client that sent the message. 
                this.broadcast(socket);

                if (this.upstream && this.upstream.OPEN) {
                    this.upstream.send(JSON.stringify(this.data));//update server connection
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
                this.publish(JSON.parse(message));
                this.broadcast();
            });
        }
    }

    // Setter for the current data object
    // set data(value) {
    //     this._data = value;
    //     this.broadcast();
    // }

    // processMessage(message, data) {
    //     new Message
    //     let parsedMessage = JSON.parse(message);
      
    //     switch (parsedMessage.type) {
    //       case 'add':
    //         //data.push(parsedMessage.data);
    //         break;
    //       case 'sync':
    //         // replace entire dataset with server response
    //         //data.splice(0, data.length, ...parsedMessage.data);
    //         break;
    //       default:
    //         console.error('Invalid message type:', parsedMessage.type);
    //         break;
    //     }
    //   }

    publish(value) {
        console.log('Data changed: ' + JSON.stringify(value));
        this.data = value;
        // Send a message to the server
        // this.upstream.send(JSON.stringify(this._data));
        // this.broadcast();
    }

    // Broadcast the current data object to all connected clients
    broadcast(socket = null) {
        this.downstream.clients.forEach(client => {
            if (socket !== client) { // ignore a particular client
                client.send(JSON.stringify(this._data));
            }
        });
    }

}

module.exports = BlockchainNode;


// class Client {
//     constructor(port) {
//         this.port = port;
//         this.socket = null;
//     }

//     connect() {
//         // Connect to the server
//         this.upstream = new WebSocket(`ws://localhost:${this.port}`);

//         // Receive messages from the server
//         this.upstream.on('message', message => {
//             console.log(`Received message: ${message}`);
//         });
//     }

//     publishChanges(changes) {
//         // Send a message to the server
//         const message = {
//             type: 'change',
//             data: changes
//         };
//         this.socket.send(JSON.stringify(message));
//     }
// }

// // Usage example
// const client = new Client(3000);
// client.connect();
// client.publishChanges({ foo: 'baz' });
