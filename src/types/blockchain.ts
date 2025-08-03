export interface BlockchainContract {
  requestRandomness(entityHash: string, saltBytes32: string): Promise<string>;
  fetchRandomness(entityHash: string): Promise<number>;
}