// wallet.js — Wallet connection + Normie loading
import { fetchNormieFull, makeDemoNormie } from './normie-api.js';

const CONTRACT = '0x9Eb6E2025B64f340691e424b7fe7022fFDE12438';
const ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
];

export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, address };
}

export async function loadWalletNormies(address, provider, onProgress) {
  const contract = new ethers.Contract(CONTRACT, ABI, provider);
  const balance = Number(await contract.balanceOf(address));
  const ids = [];
  for (let i = 0; i < Math.min(balance, 30); i++) {
    ids.push(Number(await contract.tokenOfOwnerByIndex(address, i)));
  }
  const normies = [];
  for (const id of ids) {
    const n = await fetchNormieFull(id);
    normies.push(n);
    if (onProgress) onProgress([...normies]);
    await delay(350);
  }
  return normies;
}

const DEMO_IDS = [1,7,42,100,256,420,888,1000,1337,2000,3000,3333,4000,5000,6000,7000,8000,9000,9500,9999];

export async function loadDemoNormies(onProgress) {
  const normies = [];
  for (const id of DEMO_IDS) {
    let n;
    try { n = await fetchNormieFull(id); } catch { n = makeDemoNormie(id); }
    normies.push(n);
    if (onProgress) onProgress([...normies]);
    await delay(200);
  }
  return normies;
}

const delay = ms => new Promise(r => setTimeout(r, ms));
