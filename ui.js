// UI logic for wallet connect and party selector
import { connectWallet, fetchNormiesNFTs } from './wallet.js';

const CONTRACT = '0x9435208ca4a8dfba4bbffc52bd4d65fac3a87fd4';
const SUPPLY = 10000;
const MAX_PARTY = 5;

let walletAddress = null;
let collection = [];
let party = [];

function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-connect').onclick = async () => {
    try {
      const { address } = await connectWallet();
      walletAddress = address;
      document.getElementById('wallet-address').textContent = address;
      document.getElementById('wallet-address').style.display = 'block';
      showPanel('party');
      loadCollection();
    } catch (e) {
      alert('Wallet connect failed: ' + e.message);
    }
  };
  document.getElementById('btn-demo').onclick = () => {
    walletAddress = null;
    collection = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Normie #${i + 1}` }));
    showPanel('party');
    renderGrid();
  };
  document.getElementById('btn-back-connect').onclick = () => showPanel('connect');
  document.getElementById('btn-explore').onclick = () => {
    window.selectedParty = [...party];
    showPanel('overworld');
    // Optionally, you could trigger a scene restart or update party data here if needed
    // Do NOT reload or re-import main.js; Phaser should only be initialized once
  };
});

async function loadCollection() {
  document.getElementById('normie-grid').innerHTML = '<div class="loading-state">Loading…</div>';
  try {
    const ids = await fetchNormiesNFTs(walletAddress, CONTRACT, SUPPLY);
    collection = ids.map(id => ({ id, name: `Normie #${id}` }));
    renderGrid();
  } catch (e) {
    document.getElementById('normie-grid').innerHTML = '<div class="loading-state">Failed to load NFTs</div>';
  }
}

function renderGrid() {
  const grid = document.getElementById('normie-grid');
  grid.innerHTML = '';
  collection.forEach(n => {
    const inParty = party.some(p => p.id === n.id);
    const card = document.createElement('div');
    card.className = 'ncard' + (inParty ? ' in-party' : '');
    card.innerHTML = `<div class="ncard-id">${n.name}</div>`;
    if (!inParty) card.onclick = () => addToParty(n);
    grid.appendChild(card);
  });
  document.getElementById('col-count').textContent = collection.length ? `(${collection.length})` : '';
  document.getElementById('party-count-label').textContent = `${party.length} / ${MAX_PARTY}`;
  document.getElementById('btn-explore').disabled = party.length === 0;
  renderSlots();
}

function renderSlots() {
  const cont = document.getElementById('party-slots');
  cont.innerHTML = '';
  for (let i = 0; i < MAX_PARTY; i++) {
    const n = party[i];
    const slot = document.createElement('div');
    slot.className = 'slot ' + (n ? 'filled' : 'empty');
    if (n) {
      const rm = document.createElement('button');
      rm.className = 'slot-remove';
      rm.textContent = '×';
      rm.onclick = e => { e.stopPropagation(); removeFromParty(i); };
      const nm = document.createElement('div');
      nm.className = 'slot-name';
      nm.textContent = n.name;
      slot.append(rm, nm);
    } else {
      slot.innerHTML = `<div class="slot-num">${i + 1}</div><div class="slot-empty-label">—</div>`;
    }
    cont.appendChild(slot);
  }
}

function addToParty(n) {
  if (party.length >= MAX_PARTY || party.find(p => p.id === n.id)) return;
  party.push(n);
  renderGrid();
}

function removeFromParty(idx) {
  party.splice(idx, 1);
  renderGrid();
}
