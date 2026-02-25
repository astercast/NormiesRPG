// wallet.js — Wallet connection (MetaMask, Coinbase, Rabby, WalletConnect, any injected)
import { fetchNormieFull, makeDemoNormie } from './normie-api.js';

const CONTRACT = '0x9Eb6E2025B64f340691e424b7fe7022fFDE12438';
const ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
];

// Detect all available wallet providers
export function detectWallets() {
  const wallets = [];

  // EIP-1193 injected providers
  if (window.ethereum) {
    if (window.ethereum.isMetaMask) wallets.push({ id: 'metamask', name: 'MetaMask', provider: window.ethereum });
    else if (window.ethereum.isCoinbaseWallet) wallets.push({ id: 'coinbase', name: 'Coinbase Wallet', provider: window.ethereum });
    else if (window.ethereum.isRabby) wallets.push({ id: 'rabby', name: 'Rabby', provider: window.ethereum });
    else if (window.ethereum.isBraveWallet) wallets.push({ id: 'brave', name: 'Brave Wallet', provider: window.ethereum });
    else wallets.push({ id: 'injected', name: 'Browser Wallet', provider: window.ethereum });
  }

  // EIP-6963 multi-injected providers
  if (window.ethereum?.providers) {
    window.ethereum.providers.forEach(p => {
      if (p.isMetaMask && !wallets.find(w=>w.id==='metamask'))
        wallets.push({ id: 'metamask', name: 'MetaMask', provider: p });
      if (p.isCoinbaseWallet && !wallets.find(w=>w.id==='coinbase'))
        wallets.push({ id: 'coinbase', name: 'Coinbase Wallet', provider: p });
    });
  }

  return wallets;
}

export async function connectWallet(providerId = null) {
  // Try WalletConnect if no injected wallet and WC is loaded
  const wallets = detectWallets();

  let rawProvider;

  if (wallets.length === 0) {
    // No injected wallet — try to open wallet app or show install prompt
    throw new Error('NO_WALLET');
  }

  // Use specified or first available
  const chosen = providerId ? wallets.find(w=>w.id===providerId) : wallets[0];
  rawProvider = (chosen || wallets[0]).provider;

  await rawProvider.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.BrowserProvider(rawProvider);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, address, walletName: (chosen||wallets[0]).name };
}

export async function loadWalletNormies(address, provider, onProgress) {
  const contract = new ethers.Contract(CONTRACT, ABI, provider);
  const balance = Number(await contract.balanceOf(address));
  if (balance === 0) return [];

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
    await delay(150);
  }
  return normies;
}

const delay = ms => new Promise(r => setTimeout(r, ms));
