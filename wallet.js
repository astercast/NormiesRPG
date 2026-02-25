// wallet.js — MetaMask + ERC-721 token loading + demo mode
import { fetchNormieMeta, fetchNormiePixels, makeDemoNormie, getPixelCanvas, calcStats } from './normie-api.js';

const CONTRACT = '0x9Eb6E2025B64f340691e424b7fe7022fFDE12438';
const ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function tokenOfOwnerByIndex(address, uint256) view returns (uint256)',
  'function tokensOfOwner(address) view returns (uint256[])',
];

export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  const address = accounts[0];
  const provider = window.ethereum;
  return { provider, address };
}

async function ethCall(provider, to, sig, args = []) {
  // Minimal ethers-free ABI encoder for simple calls
  const selector = sig.slice(0, 10);
  const data = encodeCall(selector, args);
  const res = await provider.request({
    method: 'eth_call',
    params: [{ to, data }, 'latest'],
  });
  return res;
}

function encodeCall(selector, args) {
  // Simple encoder for (address) and () calls
  if (!args.length) return selector;
  const enc = args.map(a => {
    if (typeof a === 'string' && a.startsWith('0x') && a.length === 42) {
      return a.slice(2).toLowerCase().padStart(64, '0');
    }
    if (typeof a === 'number' || typeof a === 'bigint') {
      return BigInt(a).toString(16).padStart(64, '0');
    }
    return '';
  }).join('');
  return selector + enc;
}

function keccak4(sig) {
  // Pre-computed selectors for our ABI
  const sels = {
    'balanceOf(address)':         '0x70a08231',
    'tokenOfOwnerByIndex(address,uint256)': '0x2f745c59',
    'tokensOfOwner(address)':     '0x8462151c',
  };
  return sels[sig] || '0x00000000';
}

function decodeUint(hex) {
  return parseInt(hex.slice(2, 66), 16);
}

function decodeUintArray(hex) {
  if (!hex || hex.length < 4) return [];
  const data = hex.startsWith('0x') ? hex.slice(2) : hex;
  const offset = parseInt(data.slice(0, 64), 16) * 2;
  const len = parseInt(data.slice(64, 128), 16);
  const result = [];
  for (let i = 0; i < len; i++) {
    const start = 128 + i * 64;
    result.push(parseInt(data.slice(start, start + 64), 16));
  }
  return result;
}

export async function loadWalletNormies(address, provider, onProgress) {
  const normies = [];

  // Try tokensOfOwner first (one call)
  try {
    const sel = keccak4('tokensOfOwner(address)');
    const encoded = sel + address.slice(2).toLowerCase().padStart(64, '0');
    const res = await provider.request({
      method: 'eth_call',
      params: [{ to: CONTRACT, data: encoded }, 'latest'],
    });
    const ids = decodeUintArray(res);
    if (ids.length) {
      for (let i = 0; i < Math.min(ids.length, 40); i++) {
        const n = await loadOne(ids[i]);
        if (n) { normies.push(n); onProgress?.([...normies]); }
        if (i < ids.length - 1) await delay(300);
      }
      return normies;
    }
  } catch (e) { /* fall through */ }

  // Fallback: enumerate
  try {
    const balSel = keccak4('balanceOf(address)');
    const balEnc = balSel + address.slice(2).toLowerCase().padStart(64, '0');
    const balRes = await provider.request({
      method: 'eth_call',
      params: [{ to: CONTRACT, data: balEnc }, 'latest'],
    });
    const bal = decodeUint(balRes);
    const count = Math.min(bal, 40);
    for (let i = 0; i < count; i++) {
      const idxSel = keccak4('tokenOfOwnerByIndex(address,uint256)');
      const idxEnc = idxSel + address.slice(2).toLowerCase().padStart(64, '0')
                            + i.toString(16).padStart(64, '0');
      const idRes = await provider.request({
        method: 'eth_call',
        params: [{ to: CONTRACT, data: idxEnc }, 'latest'],
      });
      const id = decodeUint(idRes);
      const n = await loadOne(id);
      if (n) { normies.push(n); onProgress?.([...normies]); }
      await delay(350);
    }
  } catch (e) { console.error('wallet load failed', e); }

  return normies;
}

async function loadOne(id) {
  try {
    const [meta, pixels] = await Promise.all([
      fetchNormieMeta(id),
      fetchNormiePixels(id),
    ]);
    if (!meta) return null;
    meta.pixels = pixels;
    if (pixels) meta.pixelCanvas = getPixelCanvas(id, pixels, 1);
    return meta;
  } catch (e) {
    console.warn('loadOne failed', id, e);
    return null;
  }
}

// Demo mode — 20 normies with pixel data from API
const DEMO_IDS = [1,7,42,100,256,420,888,1000,1337,2000,3000,3333,4000,5000,6000,7000,8000,9000,9500,9999];

export async function loadDemoNormies(onProgress) {
  const normies = [];
  for (let i = 0; i < DEMO_IDS.length; i++) {
    const id = DEMO_IDS[i];
    try {
      const [meta, pixels] = await Promise.allSettled([
        fetchNormieMeta(id),
        fetchNormiePixels(id),
      ]);
      if (meta.status === 'fulfilled' && meta.value) {
        const n = meta.value;
        if (pixels.status === 'fulfilled' && pixels.value) {
          n.pixels = pixels.value;
          n.pixelCanvas = getPixelCanvas(id, pixels.value, 1);
        }
        normies.push(n);
      } else {
        // Fallback to generated demo normie
        normies.push(makeDemoNormie(id));
      }
    } catch {
      normies.push(makeDemoNormie(id));
    }
    onProgress?.([...normies]);
    await delay(350); // respect 60/min rate limit
  }
  return normies;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
