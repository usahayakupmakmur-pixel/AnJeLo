import { ethers } from 'ethers';

/**
 * ERC-1056 Inspired DID Registry Simulation
 * Aligned with Metro Timur SSI Reference Architecture
 */
export class DIDRegistryContract {
  private static instance: DIDRegistryContract;
  private registry: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): DIDRegistryContract {
    if (!DIDRegistryContract.instance) {
      DIDRegistryContract.instance = new DIDRegistryContract();
    }
    return DIDRegistryContract.instance;
  }

  /**
   * changeOwner(identity, newOwner)
   */
  async changeOwner(identity: string, newOwner: string): Promise<boolean> {
    console.log(`[Blockchain] Changing owner of ${identity} to ${newOwner}`);
    const record = this.registry.get(identity) || { owner: identity, attributes: [] };
    record.owner = newOwner;
    this.registry.set(identity, record);
    return true;
  }

  /**
   * setAttribute(identity, name, value, validity)
   */
  async setAttribute(identity: string, name: string, value: string, validity: number): Promise<boolean> {
    console.log(`[Blockchain] Setting attribute ${name} for ${identity}`);
    const record = this.registry.get(identity) || { owner: identity, attributes: [] };
    record.attributes.push({ name, value, expires: Date.now() + validity * 1000 });
    this.registry.set(identity, record);
    return true;
  }

  /**
   * getAttributes(identity)
   */
  async getAttributes(identity: string): Promise<any[]> {
    const record = this.registry.get(identity);
    return record ? record.attributes : [];
  }

  /**
   * verifyDID(did)
   * Checks if the DID is registered and active on the "Besu" network
   */
  async verifyDID(did: string): Promise<boolean> {
    // In a real app, this calls the smart contract on Hyperledger Besu
    const address = did.split(':').pop();
    return !!address && ethers.isAddress(address);
  }
}
