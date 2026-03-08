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
  const seenProviders = new Set();

  const addProvider = (provider) => {
    if (!provider || seenProviders.has(provider)) return;
    seenProviders.add(provider);

    let id = 'injected';
    let name = 'Browser Wallet';

    if (provider.isCoinbaseWallet) {
      id = 'coinbase';
      name = 'Coinbase Wallet';
    } else if (provider.isMetaMask) {
      id = 'metamask';
      name = 'MetaMask';
    } else if (provider.isRabby) {
      id = 'rabby';
      name = 'Rabby';
    } else if (provider.isBraveWallet) {
      id = 'brave';
      name = 'Brave Wallet';
    }

    if (!wallets.find((w) => w.id === id)) {
      wallets.push({ id, name, provider });
    }
  };

  // EIP-1193 default injected provider
  if (window.ethereum) addProvider(window.ethereum);

  // Multi-injected providers (MetaMask + Coinbase side-by-side, etc.)
  if (Array.isArray(window.ethereum?.providers)) {
    window.ethereum.providers.forEach((p) => addProvider(p));
  }

  return wallets;
}

export async function connectWallet(providerId = null) {
  const wallets = detectWallets();

  if (wallets.length === 0) {
    throw new Error('NO_WALLET');
  }

  const chosen = providerId ? wallets.find((w) => w.id === providerId) : wallets[0];
  const selected = chosen || wallets[0];
  const rawProvider = selected.provider;

  if (!rawProvider || typeof rawProvider.request !== 'function') {
    throw new Error('WALLET_PROVIDER_UNAVAILABLE');
  }

  try {
    await rawProvider.request({ method: 'eth_requestAccounts' });
  } catch (err) {
    if (err?.code === 4001) throw new Error('USER_REJECTED');
    throw err;
  }

  const provider = new ethers.BrowserProvider(rawProvider);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, address, walletName: selected.name };
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
