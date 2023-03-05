const WebSocket = require('ws');
const { program } = require('commander');

program
    .option('-h, --host <host>', 'The hostname or IP address of the node to connect to');

program.parse(process.argv);

const options = program.opts();

const host = options.host || 'localhost:3001';

const socket = new WebSocket(`ws://${host}`);

// Send the JSON object to the server
function sendData() {

    const data = { 
        hash: Math.random(),
        data: 'hello world'
    };
    console.log(`sending:`, JSON.stringify(data));
    socket.send(JSON.stringify(data));
}

// Handle incoming messages from the server
socket.onmessage = event => {
    const data = JSON.parse(event.data);
    console.log(`Received data:`, event.data);
}

// Send the JSON object every 5 seconds
setInterval(sendData, 5000);