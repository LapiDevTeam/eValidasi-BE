const fs = require('fs');

const wbLines = fs.readFileSync('tmp/workbook-AI13-AO22.txt', 'utf8').split(/\r?\n/);
const nodeData = JSON.parse(fs.readFileSync('tmp/session13-AL-AM-AN-AO-node.json', 'utf8'));

const wbMap = {};
for (const line of wbLines) {
  const m = line.match(/^(A[LMNO]\d+) \| [^|]* \| ([^|]*) \|/);
  if (!m) continue;

  const addr = m[1];
  const raw = String(m[2]).trim();
  const num = Number(raw);
  if (!Number.isNaN(num)) wbMap[addr] = num;
}

const rows = [16, 17, 18, 19, 20, 21, 22];
const out = [];

for (const row of rows) {
  const n = nodeData.rows.find((x) => x.rowLabel === row);
  if (!n) continue;

  out.push({
    row,
    wbAL: wbMap[`AL${row}`],
    nodeAL: n.AL,
    dAL: n.AL - wbMap[`AL${row}`],
    wbAM: wbMap[`AM${row}`],
    nodeAM: n.AM,
    dAM: n.AM - wbMap[`AM${row}`],
    wbAN: wbMap[`AN${row}`],
    nodeAN: n.AN,
    dAN: n.AN - wbMap[`AN${row}`],
    wbAO: wbMap[`AO${row}`],
    nodeAO: n.AO,
    dAO: n.AO - wbMap[`AO${row}`],
  });
}

console.log(JSON.stringify(out, null, 2));
