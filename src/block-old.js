const NodeRSA = require("node-rsa");
const CryptoJS = require("crypto-js");

class Block {
    constructor(data, previousHash, publicKey) {
        this.data = data;
        this.previousHash = previousHash;
        this.timestamp = Date.now();
        this.hash = this.calculateHash();
        this.publicKey = publicKey;
        this.signature = null;
    }

    calculateHash() {
        return CryptoJS.SHA256(
            this.previousHash +
            this.timestamp.toString() +
            JSON.stringify(this.data)
        ).toString();
    }

    signBlock(privateKey) {
        const rsa = new NodeRSA(privateKey);
        this.signature = rsa.sign(this.calculateHash(), "base64");
    }

    isValidBlock() {
        const rsa = new NodeRSA(this.publicKey);
        return rsa.verify(this.calculateHash(), this.signature, "utf8", "base64");
    }
}

module.exports = Block;