const NodeRSA = require("node-rsa");
const CryptoJS = require("crypto-js");

/**
 * Represents a block in a blockchain.
 * 
 * The purpose of the Block class is to represent a single transaction on the blockchain. 
 * Each block in the blockchain stores a hash of the block's data, and is linked to other blocks via a hash of the previous block's data.
 * 
 *  Block class has the following properties:
 * 
 * - index: The index of the block in the blockchain. This is used to easily identify the order of the blocks in the chain without needing step through all the hash links
 * - timestamp: The timestamp of the block, which represents the time when the block was created.
 * - data: The data that is contained in the block. This could be a set of transactions, lottery entry details, or any other information that needs to be stored in the blockchain.
 * - previousHash: The hash of the previous block in the chain. This is used to link the blocks together in the chain and maintain the integrity of the blockchain.
 * - hash: The hash of the current block. This is calculated based on the data in the block, timestamp and previousHash; and is used to ensure the integrity of the block and prevent tampering.
 * - signature: The signature the block creator to provide proof that the block was created by an authorised source
 * - owner: The signature of the block owner, used to validate ownership of the block to claim prizes or create additional transaction on the block
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
        this.owner = null;
    }

    /**
     * This method calculates and returns the SHA256 hash of the block's data, timestamp, and previous hash.
     * The hash is stored in the hash property of the block.
     * 
     @returns {string} The calculated SHA256 hash.
    */
    calculateHash() {
        this.hash = CryptoJS.SHA256(
            this.previousHash +
            this.timestamp.toString() +
            JSON.stringify(this.data)
        ).toString();

        return this.hash;
    }

    /**
     * Signs the block to provide proof that the block was created by an authorised source using the provided private key.
     * @param {string} privateKey - The private key used to sign the block.
     */
    signBlock(privateKey) {
        this.signature = (privateKey) ? privateKey.sign(this.calculateHash(), "base64") : null;
    }

    /**
     * Verifies the block's signature and data using the provided public key.
     * 
     * @param {string} publicKey - The public key used to verify the block's signature.
     * @returns {boolean} True if the signature is valid, false otherwise.
     */
    isValidBlock(publicKey) {
        if (!this.signature) return false;
        return publicKey.verify(this.calculateHash(), this.signature, "utf8", "base64");
    }

    /**
     * Marks the block as owned by the provided private key. Only someone with access to the private key can prove ownership of this block. 
     *  
     * @param {string} key - The key used to mark the block as owned.
     */
    markOwner(key) {
        if(!key) {this.owner = null; return;};
        this.owner = key.sign(this.calculateHash(), 'base64');

    }

    /**
     * Verifies the block's owner using the provided private key.
     * 
     * @param {string} key - The private key used to verify the block's owner.
     * @returns {boolean} True if the owner is valid, false otherwise.
     */
    verifiedOwner(key) {
        // Verify the signature using the public key
        return key.verify(this.calculateHash(), this.owner, 'utf8', 'base64');
    }

    /**
     * Deserializes a block back into a Block object.
     * 
     * @param {Object} serializedBlock - The serialized block to be deserialized.
     * @returns {Block} The deserialized Block object.
     */
    static deserialize(serializedBlock) {
        const { index, timestamp, data, previousHash, hash, publicKey, signature, owner } = serializedBlock;
        const block = new Block(index, timestamp, data, previousHash, publicKey);
        block.signature = signature;
        block.owner = owner;
        block.hash = hash;
        return block;
    }

    /**
     * Serializes the block into a plain JSON object.
     * 
     * @returns {Object} The serialized block.
     */
    serialize() {
        return {
            index: this.index,
            timestamp: this.timestamp,
            data: this.data,
            previousHash: this.previousHash,
            hash: this.hash,
            publicKey: this.publicKey,
            signature: this.signature,
            owner: this.owner
        };
    }
}

module.exports = Block;