// wallet.js — Normies ERC-721 on Ethereum
// Contract: 0x9Eb6E2025B64f340691e424b7fe7022fFDE12438 (from llms.txt)
import { fetchNormieMeta } from './normie-api.js';

const CONTRACT = '0x9Eb6E2025B64f340691e424b7fe7022fFDE12438'; // ERC-721C
const SUPPLY   = 10000;

// ERC-721 ABI — balanceOf + tokenOfOwnerByIndex
const ABI_721 = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokensOfOwner(address owner) view returns (uint256[])',
];

export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  const provider = new window.ethers.BrowserProvider(window.ethereum, 'any');
  const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return { provider, address };
}

export async function loadWalletNormies(address, provider, onProgress) {
  const contract = new window.ethers.Contract(CONTRACT, ABI_721, provider);
  let tokenIds = [];

  // Try tokensOfOwner first (cheaper one-call), fallback to enumerate
  try {
    const tokens = await contract.tokensOfOwner(address);
    tokenIds = tokens.map(t => Number(t)).slice(0, 40);
  } catch {
    // Fallback: balanceOf + tokenOfOwnerByIndex
    try {
      const bal = Number(await contract.balanceOf(address));
      const limit = Math.min(bal, 40);
      const calls = Array.from({length: limit}, (_, i) =>
        contract.tokenOfOwnerByIndex(address, i).then(Number).catch(() => null)
      );
      tokenIds = (await Promise.all(calls)).filter(x => x !== null);
    } catch (e) {
      throw new Error('Could not load NFTs: ' + e.message);
    }
  }

  const collection = [];
  for (let i = 0; i < tokenIds.length; i += 4) {
    const batch = await Promise.all(tokenIds.slice(i, i+4).map(id => fetchNormieMeta(id)));
    batch.forEach(m => { if (m) collection.push(m); });
    if (onProgress) onProgress([...collection]);
  }
  return collection;
}

export async function loadDemoNormies(onProgress) {
  // Pick 20 random IDs spread across the full 0-9999 range
  const ids = new Set();
  const ranges = [[0,1000],[1000,3000],[3000,6000],[6000,9000],[9000,9999]];
  ranges.forEach(([lo,hi]) => {
    while (ids.size < ids.size + 4 && ids.size < 20) {
      ids.add(Math.floor(lo + Math.random() * (hi - lo)));
    }
  });
  while (ids.size < 20) ids.add(Math.floor(Math.random() * SUPPLY));

  const collection = [];
  const arr = [...ids];
  for (let i = 0; i < arr.length; i += 4) {
    const batch = await Promise.all(arr.slice(i, i+4).map(id => fetchNormieMeta(id)));
    batch.forEach(m => { if (m) collection.push(m); });
    if (onProgress) onProgress([...collection]);
  }
  return collection;
}
