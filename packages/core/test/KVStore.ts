import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Signer } from 'ethers';
import { KVStore } from '../typechain-types';
import fs from 'fs';
import path from 'path';
import * as openpgp from 'openpgp';

describe('KVStore', function () {
  let accountOne: Signer, accountTwo: Signer;
  let kvStore: KVStore;

  this.beforeAll(async () => {
    [accountOne, accountTwo] = await ethers.getSigners();

    const KVStore = await ethers.getContractFactory('KVStore');

    kvStore = await KVStore.deploy();
  });

  it('returns a correct value to the address storing the key-value pair', async () => {
    await kvStore.set('satoshi', 'nakamoto');
    const value = await kvStore.get(accountOne.getAddress(), 'satoshi');
    expect(value).equal('nakamoto');
  });

  it('returns a correct value to another address', async () => {
    await kvStore.set('satoshi', 'nakamoto');
    const value = await kvStore
      .connect(accountTwo)
      .get(accountOne.getAddress(), 'satoshi');
    expect(value).equal('nakamoto');
  });

  it("doesn't allow storing a too long key", async () => {
    await expect(
      kvStore.set(
        'satoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamoto',
        'satoshi'
      )
    ).to.be.revertedWith('Maximum string length');
  });

  it("doesn't allow storing a too long value", async () => {
    await expect(
      kvStore.set(
        'satoshi',
        'satoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamotosatoshinakamoto'
      )
    ).to.be.revertedWith('Maximum string length');
  });

  it('outputs an address on deployment', async () => {
    expect(typeof kvStore.address).equal('string');
    expect(kvStore.address.length).greaterThanOrEqual(10);
  });

  it('store public key and its ipfs hash on smart contract', async () => {
    await kvStore.set(
      'public_key',
      'bafkreieadxyvobae4a2ww7tytw37dw2ihvvbujj5npjepurraavtaoczcq'
    );

    const value = await kvStore.get(accountOne.getAddress(), 'public_key');
    expect(value).equal(
      'bafkreieadxyvobae4a2ww7tytw37dw2ihvvbujj5npjepurraavtaoczcq'
    );
  });

  it('should store encrypted value and decrypt the value', async () => {
    const encrypted = fs.readFileSync(
      path.resolve(__dirname, './encrypted_message.txt'),
      { encoding: 'utf8', flag: 'r' }
    );
    const privkey = fs.readFileSync(
      path.resolve(__dirname, './private_key_for_testing'),
      { encoding: 'utf8', flag: 'r' }
    );
    await kvStore.set('satoshi', encrypted);
    const value = await kvStore.get(accountOne.getAddress(), 'satoshi');
    expect(value).equal(encrypted);
    const message = await openpgp.readMessage({
      armoredMessage: encrypted,
    });
    const { data: decrypted } = await openpgp.decrypt({
      message,
      decryptionKeys: await openpgp.readPrivateKey({ armoredKey: privkey }),
    });
    expect(decrypted).equal('H');
  });
});
