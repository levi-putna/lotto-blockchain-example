const Block = require("./block");
const NodeRSA = require('node-rsa');

class Blockchain {
    constructor(genesisData = null, publicKey = null, privateKey = null) {
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        this.chain = [this.createGenesisBlock(genesisData)];
    }

    createGenesisBlock(data = null) {
        let block = new Block(0, new Date().toString(), data || "Genesis Block", "0");
        block.hash = block.calculateHash();
        block.signBlock(this.privateKey);
        return block;
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(data) {
        const newBlock = new Block(this.chain.length, new Date().toString(), data);
        newBlock.previousHash = this.getLatestBlock().hash;
        newBlock.hash = newBlock.calculateHash();
        newBlock.signBlock(this.privateKey);
        this.chain.push(newBlock);
        return newBlock;
    }

    /**
     * We want to remove all items from the end of the array until an object with a matching hash value is found. 
     * The targetHash variable contains the hash we're looking for.
     * @param {*} targetHash 
     */
    removeBlock(targetHash) {
        let removed = false;
        while (this.chain.length > 0) {
            const lastItem = this.chain[this.chain.length - 1];
            if (lastItem.hash === targetHash) {
                this.chain.pop();
                removed = true;
                break;
            } else {
                this.chain.pop();
                removed = true;
            }
        }
        return removed;
    }

    /**
     * 
     * This method is called addBlockFromNetwork, and it takes a Block object as a parameter. Here's how it works:
     * 
     * First, it checks that the index of the block is valid. The index should be one greater than the index of the latest block in the chain.
     * Next, it checks that the previous hash of the block is valid. The previous hash should be equal to the hash of the latest block in the chain.
     * Then, it checks that the hash of the block is valid. It does this by calling the calculateHash method on the block and comparing the result to the hash property of the block.
     * If all the checks pass, the block is added to the chain by calling the push method on the chain array, and a message is logged to the console indicating that the block has been added.
     * If any of the checks fail, the method returns without adding the block to the chain, and a message is logged to the console indicating the reason for the failure.
     * @param {*} block 
     * @returns 
     */
    addBlockFromNetwork(block) {
        if (block.index !== this.getLatestBlock().index + 1) {
            console.error("Block index is not valid");
            return false;
        }

        if (block.previousHash !== this.getLatestBlock().hash) {
            console.error("Block previous hash is not valid");
            return false;
        }

        if (block.hash !== block.calculateHash()) {
            console.error("Block hash is not valid");
            return false;
        }

        this.chain.push(block);
        return true;
    }

    isValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }

        return true;
    }

    static deserialize(serializedBlockchain) {
        const { chain, publicKey } = serializedBlockchain;

        const blockchain = new Blockchain();
        blockchain.publicKey = publicKey;
        blockchain.chain = chain.map((block) => Block.deserialize(block));
        return blockchain;
    }

    serialize() {
        return {
            publicKey: this.publicKey,
            chain: this.chain.map(block => block.serialize())
        };
    }
}

module.exports = Blockchain;