const Blockchain = require('./blockchain');
const Block = require('./block');

describe('Blockchain', () => {
  let blockchain;

  beforeEach(() => {
    blockchain = new Blockchain();
  });

  test('creates a genesis block', () => {
    expect(blockchain.chain.length).toBe(1);
    expect(blockchain.chain[0]).toEqual(blockchain.createGenesisBlock());
  });

  test('adds a new block', () => {
    const data = 'New block data';
    const block = blockchain.addBlock(data);

    expect(blockchain.chain.length).toBe(2);
    expect(block).toEqual(new Block(1, expect.any(String), data, expect.any(String)));
  });

  test('removes a block', () => {
    blockchain.addBlock('Block 1');
    blockchain.addBlock('Block 2');
    blockchain.addBlock('Block 3');

    expect(blockchain.chain.length).toBe(4);
    const targetHash = blockchain.chain[2].hash;
    const result = blockchain.removeBlock(targetHash);
    expect(result).toBe(true);
    expect(blockchain.chain.length).toBe(3);
    expect(blockchain.chain[2].hash).not.toBe(targetHash);
  });

  test('adds a new block from network', () => {
    const data = 'New block data';
    const block = new Block(1, new Date().toString(), data, blockchain.getLatestBlock().hash);
    block.hash = block.calculateHash();
    block.signBlock(blockchain.privateKey);
    const result = blockchain.addBlockFromNetwork(block);

    expect(result).toBe(true);
    expect(blockchain.chain.length).toBe(2);
    expect(blockchain.chain[1]).toEqual(block);
  });

  test('checks if the blockchain is valid', () => {
    blockchain.addBlock('Block 1');
    blockchain.addBlock('Block 2');
    blockchain.addBlock('Block 3');

    expect(blockchain.isValid()).toBe(true);

    // tamper with a block
    blockchain.chain[1].data = 'Tampered data';

    expect(blockchain.isValid()).toBe(false);
  });
});