// Wallet and party selector logic for NormiesRPG
// Uses ethers.js (must be loaded in index.html)

export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  const provider = new window.ethers.BrowserProvider(window.ethereum, 'any');
  const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return { provider, address };
}

export async function fetchNormiesNFTs(address, contract, supply = 10000) {
  // ERC-1155 balanceOfBatch
  const abi = ['function balanceOfBatch(address[] a,uint256[] ids) view returns(uint256[])'];
  const c = new window.ethers.Contract(contract, abi, window.ethers.getDefaultProvider());
  const owned = [];
  for (let i = 0; i < supply && owned.length < 40; i += 100) {
    const ids = Array.from({ length: Math.min(100, supply - i) }, (_, k) => i + k);
    const bals = await c.balanceOfBatch(Array(ids.length).fill(address), ids);
    bals.forEach((b, k) => { if (Number(b) > 0) owned.push(i + k); });
  }
  return owned;
}
