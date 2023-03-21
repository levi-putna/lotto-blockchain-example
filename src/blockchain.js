const Block = require("./block");
const NodeRSA = require('node-rsa');

/**
 * A class representing a blockchain.
 */
class Blockchain {

    /**
     * Constructs a new blockchain instance.
     * 
     * @param {any} [genesisData=null] The data for the genesis block.
     * @param {string} [publicKey=null] The public key used verify block signature blocks.
     * @param {string} [privateKey=null] The private key used to sign blocks.
     */
    constructor(genesisData = null, publicKey = null, privateKey = null) {
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        this.chain = [this.createGenesisBlock(genesisData)];
    }

    /**
     * Creates the genesis block for the blockchain.
     * 
     * @param {any} [data=null] The data to include in the block.
     * @returns {Block} The genesis block.
     */
    createGenesisBlock(data = null) {
        let block = new Block(0, new Date().toString(), data || "Genesis Block", "0");
        block.hash = block.calculateHash();
        block.signBlock(this.privateKey);
        return block;
    }

    /**
     * Gets the latest block in the blockchain.
     * 
     * @returns {Block} The latest block.
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Adds a new block to the blockchain.
     * 
     * @param {any} data The data to include in the block.
     * @param {string} [key=null] The public key of the block owner.
     * @returns {Block} The new block.
     */
    addBlock(data, key = null) {
        const newBlock = new Block(this.chain.length, new Date().toString(), data);
        newBlock.previousHash = this.getLatestBlock().hash;
        newBlock.hash = newBlock.calculateHash();
        newBlock.signBlock(this.privateKey);
        newBlock.markOwner(key);
        this.chain.push(newBlock);
        return newBlock;
    }

    /**
     * 
     * @param {*} targetHash 
     */

    /**
     * Removes blocks from the end of the chain until a block with the specified hash is found. We want to remove all items from the 
     * end of the array until an object with a matching hash value is found. 
     * 
     * @param {string} targetHash The hash of the block to remove.
     * @returns {boolean} `true` if a block was removed, `false` otherwise.
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
     *
     * @param {*} block 
     * @returns 
     */

    /**
     * Adds an existing block to the chain that was received from the network.
     * 
     * First we checks that the index of the block is valid. The index should be one greater than the index of the latest block in the chain.
     * Next we checks that the previous hash of the block is valid. The previous hash should be equal to the hash of the latest block in the chain.
     * Then we checks that the hash of the block is valid. It does this by calling the calculateHash method on the block and comparing the result to the hash property of the block.
     * If all the checks pass, the block is added to the chain by calling the push method on the chain array, and a message is logged to the console indicating that the block has been added.
     * If any of the checks fail, the method returns without adding the block to the chain, and a message is logged to the console indicating the reason for the failure.
     * 
     * @param {Block} block The block to add to the chain.
     * @returns {boolean} `true` if the block was added, `false` otherwise.
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

    /**
     * Checks if the blockchain is valid.
     * 
     * @returns {boolean} `true` if the
     */
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

    /**
     * Creates a new instance of the Blockchain class from a serialized representation.
     * 
     * The method expects an object with a 'chain' and 'publicKey' properties.
     * The 'chain' property should be an array of serialized Block objects.
     * The 'publicKey' property should be a string representing the public key of the blockchain.
     * @param {Object} serializedBlockchain - An object with a 'chain' and 'publicKey' properties.
     * @returns {Blockchain} A new instance of the Blockchain class with the properties and blocks extracted from the serialized representation.
     */
    static deserialize(serializedBlockchain) {
        const { chain, publicKey } = serializedBlockchain;

        const blockchain = new Blockchain();
        blockchain.publicKey = publicKey;
        blockchain.chain = chain.map((block) => Block.deserialize(block));
        return blockchain;
    }

    /**
     * Returns a serialized representation of the current instance of the Blockchain class.
     * 
     * The method returns an object with a 'publicKey' and 'chain' property.
     * The 'publicKey' property is a string representing the public key of the blockchain.
     * The 'chain' property is an array of serialized Block objects.
     * @returns {Object} An object with a 'publicKey' and 'chain' property representing the serialized Blockchain.
     */
    serialize() {
        return {
            publicKey: this.publicKey,
            chain: this.chain.map(block => block.serialize())
        };
    }
}

module.exports = Blockchain;