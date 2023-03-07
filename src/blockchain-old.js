const NodeRSA = require("node-rsa");
const Block = require("./block");

class Blockchain {
    constructor(lottery) {
        this.privateKey = new NodeRSA({ b: 1024 });
        this.publicKey = this.privateKey.exportKey("public");
        this.chain = [this.createGenesisBlock(lottery)];
    }

    createGenesisBlock(lottery) {
        const genesisBlock = new Block(lottery, 0, this.publicKey);
        genesisBlock.signBlock(this.privateKey);

        return genesisBlock;
    }

    getBlock(hash) {
        return this.chain.find((block) => block.hash == hash);
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addTicket(newTicket) {
        let newBlock = new Block(
            newTicket,
            this.getLatestBlock().hash,
            this.publicKey
        );
        newBlock.signBlock(this.privateKey);
        this.chain.push(newBlock);
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentTicket = this.chain[i];
            const previousTicket = this.chain[i - 1];

            if (currentTicket.hash !== currentTicket.calculateHash()) {
                return false;
            }

            if (currentTicket.previousHash !== previousTicket.hash) {
                return false;
            }
        }

        return true;
    }

    serialize() {
        return {
            publicKey: this.publicKey,
            lenght: this.chain.length,
            chain: this.chain.map(function (block) {
                return {
                    data: block.data,
                    previousHash: block.previousHash,
                    timestamp: block.timestamp,
                    hash: block.hash,
                    signature: block.signature,
                };
            }),
        };
    }

    static fromJson(json) {
        const { publicKey, chain } = JSON.parse(json);
        //return new Blockchain(property1, property2);
    }

    toJson() {
        return JSON.stringify({
            publicKey: this.publicKey,
            lenght: this.chain.length,
            chain: this.chain.map(function (block) {
                return {
                    data: block.data,
                    previousHash: block.previousHash,
                    timestamp: block.timestamp,
                    hash: block.hash,
                    signature: block.signature,
                };
            }),
        });
    }

    static create(m) {
        return new Blockchain(m);
    }

    encode() {
        return JSON.stringify(this.serialize());
    }
}

module.exports = Blockchain;