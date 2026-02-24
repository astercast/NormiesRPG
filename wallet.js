// Wallet connection + NFT loading (read-only, no signing)
import { fetchNormieMeta, makeFallback } from './normie-api.js';

const CONTRACT = '0x9435208ca4a8dfba4bbffc52bd4d65fac3a87fd4';
const SUPPLY   = 10000;

export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  const provider = new window.ethers.BrowserProvider(window.ethereum, 'any');
  const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return { provider, address };
}

export async function loadWalletNormies(address, provider, onProgress) {
  const abi = ['function balanceOfBatch(address[] a,uint256[] ids) view returns(uint256[])'];
  const c   = new window.ethers.Contract(CONTRACT, abi, provider);
  const owned = [];
  for (let i = 0; i < SUPPLY && owned.length < 40; i += 100) {
    const ids = Array.from({ length: Math.min(100, SUPPLY - i) }, (_, k) => i + k);
    try {
      const bals = await c.balanceOfBatch(Array(ids.length).fill(address), ids);
      bals.forEach((b, k) => { if (Number(b) > 0) owned.push(i + k); });
    } catch { break; }
  }
  const collection = [];
  // Batch fetch metadata 4 at a time
  for (let i = 0; i < owned.length; i += 4) {
    const batch = await Promise.all(owned.slice(i, i + 4).map(id => fetchNormieMeta(id)));
    batch.forEach(m => { if (m) collection.push(m); });
    if (onProgress) onProgress(collection);
  }
  return collection;
}

export async function loadDemoNormies(onProgress) {
  const collection = [];
  const ids = new Set();
  while (ids.size < 20) ids.add(Math.floor(Math.random() * SUPPLY));
  const arr = [...ids];
  for (let i = 0; i < arr.length; i += 4) {
    const batch = await Promise.all(arr.slice(i, i + 4).map(id => fetchNormieMeta(id)));
    batch.forEach(m => { if (m) collection.push(m); });
    if (onProgress) onProgress([...collection]);
  }
  return collection;
}
