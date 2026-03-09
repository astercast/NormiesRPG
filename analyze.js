const fs = require('fs');
const xml = fs.readFileSync('assets/downloads/1bitpack_kenney_1.1/Tilemap/sample_urban.tmx', 'utf8');
const layers = xml.match(/<layer[^>]*>[\s\S]*?<\/layer>/g) || [];
layers.forEach(function(l) {
  const name = (l.match(/name="([^"]*)"/) || [])[1];
  const dataMatch = l.match(/<data[^>]*>([\s\S]*?)<\/data>/);
  if (dataMatch) {
    const ids = dataMatch[1].trim().split(/[\n,]+/).map(Number).filter(function(n){ return n>0; });
    const unique = Array.from(new Set(ids)).sort(function(a,b){return a-b;}).slice(0,50);
    console.log('Layer: ' + name + ' | tile IDs used: ' + unique.join(', '));
  }
});
console.log('\n--- FANTASY ---');
const xml2 = fs.readFileSync('assets/downloads/1bitpack_kenney_1.1/Tilemap/sample_fantasy.tmx', 'utf8');
const layers2 = xml2.match(/<layer[^>]*>[\s\S]*?<\/layer>/g) || [];
layers2.forEach(function(l) {
  const name = (l.match(/name="([^"]*)"/) || [])[1];
  const dataMatch = l.match(/<data[^>]*>([\s\S]*?)<\/data>/);
  if (dataMatch) {
    const ids = dataMatch[1].trim().split(/[\n,]+/).map(Number).filter(function(n){ return n>0; });
    const unique = Array.from(new Set(ids)).sort(function(a,b){return a-b;}).slice(0,50);
    console.log('Layer: ' + name + ' | tile IDs used: ' + unique.join(', '));
  }
});
