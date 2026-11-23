// Golden Dragon Training – alat za programe
// Programi su u programs/<id>.json. Nakon svake izmjene pokreni:
//   node tools/build_programs.js
// Skripta izračuna verziju (hash) svakog programa i upiše je u index.html
// (PROGRAM_FILES), tako da mobiteli skinu samo programe koji su se promijenili.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.join(__dirname,'..');
const dir=path.join(ROOT,'programs');
const files={};
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort()){
  const raw=fs.readFileSync(path.join(dir,f),'utf8');
  JSON.parse(raw); // mora biti ispravan JSON
  files[f.replace(/\.json$/,'')]=crypto.createHash('sha256').update(raw).digest('hex').slice(0,10);
}
const idx=path.join(ROOT,'index.html');
let html=fs.readFileSync(idx,'utf8');
const re=/const PROGRAM_FILES = \{[^}]*\};/;
if(!re.test(html)) throw new Error('PROGRAM_FILES nije pronađen u index.html');
html=html.replace(re,'const PROGRAM_FILES = '+JSON.stringify(files)+';');
fs.writeFileSync(idx,html);
console.log('PROGRAM_FILES:',files);
