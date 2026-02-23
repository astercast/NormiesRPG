// Fetches normie stats from Normies API (CORS-safe)
export async function fetchNormieStats(normieId) {
  const url = `https://api.normies.art/normie/${normieId}/metadata`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch normie stats');
  const data = await res.json();
  // Use Pixel Count as HP for demo
  const hpAttr = data.attributes.find(a => a.trait_type === 'Pixel Count');
  return {
    hp: hpAttr ? parseInt(hpAttr.value, 10) : 10
  };
}
