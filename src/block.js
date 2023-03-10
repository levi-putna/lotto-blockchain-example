const NodeRSA = require("node-rsa");
const CryptoJS = require("crypto-js");

/**
 * The purpose of the Block class in a blockchain implementation is to represent a single block in the blockchain. 
 * Each block in the blockchain contains a set of transactions, a timestamp, an index, a hash of the block's data, 
 * and a hash of the previous block's data.
 * 
 *  Block class has the following properties:
 * 
 * - index: The index of the block in the blockchain. This is used to maintain the order of the blocks in the chain.
 * - timestamp: The timestamp of the block, which represents the time when the block was created.
 * - data: The data that is contained in the block. This could be a set of transactions, or any other information that needs to be stored in the blockchain.
 * - previousHash: The hash of the previous block in the chain. This is used to link the blocks together in the chain and maintain the integrity of the blockchain.
 * - hash: The hash of the current block. This is calculated based on the data in the block, and is used to ensure the integrity of the block and prevent tampering.
 */
class Block {
    constructor(index, timestamp, data, previousHash, publicKey) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
        this.publicKey = publicKey;
        this.signature = null;
    }

    calculateHash() {
        this.hash = CryptoJS.SHA256(
            this.previousHash +
            this.timestamp.toString() +
            JSON.stringify(this.data)
        ).toString();

        return this.hash;
    }

    signBlock(privateKey) {
        this.signature = (privateKey) ? privateKey.sign(this.calculateHash(), "base64") : null;
    }

    isValidBlock(publicKey) {
        if(!this.signature) return false;
        return publicKey.verify(this.calculateHash(), this.signature, "utf8", "base64");
    }

    static deserialize(serializedBlock) {
        const { index, timestamp, data, previousHash, hash, publicKey, signature } = serializedBlock;
        const block = new Block(index, timestamp, data, previousHash, publicKey);
        block.signature = signature;
        block.hash = hash;
        return block;
    }

    serialize() {
        return {
            index: this.index,
            timestamp: this.timestamp,
            data: this.data,
            previousHash: this.previousHash,
            hash: this.hash,
            publicKey: this.publicKey,
            signature: this.signature
        };
    }
}

module.exports = Block;