import fs from 'node:fs';
import path from 'node:path';
import MiniSearch from 'minisearch';

const output = path.resolve('site/docs/helper');
const files = [];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(entry.name.endsWith('.html'))files.push(full)}}
walk(output);
const documents = files.map((file,index)=>{const html=fs.readFileSync(file,'utf8');const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();const title=(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'Vozen Helper docs').replace(/<[^>]+>/g,'').trim();const rel=path.relative(path.resolve('site'),file).replaceAll(path.sep,'/');return{id:String(index),title,text:text.slice(0,800),url:'/'+rel.replace(/index\.html$/,'')}});
const search = new MiniSearch({fields:['title','text'],storeFields:['title','text','url']});search.addAll(documents);
fs.writeFileSync(path.join(output,'search.json'),JSON.stringify({schemaVersion:1,index:search.toJSON(),documents},null,2)+'\n');
// The shared shell loads script data so search also works from static hosting.
fs.writeFileSync(path.join(output,'search-data.js'), 'globalThis.VOZEN_DOCS_SEARCH=globalThis.VOZEN_DOCS_SEARCH||{};globalThis.VOZEN_DOCS_SEARCH.helper=' + JSON.stringify({schemaVersion:1,documents}) + ';\n');
const manifest = JSON.parse(fs.readFileSync(path.resolve('docs-src/en/helper/_data/features.json'),'utf8'));
manifest.routes = Object.fromEntries(manifest.features.map(feature => [feature.key, 'modules/' + feature.slug + '/index.html']));
fs.writeFileSync(path.join(output,'data/helper-docs-manifest.js'), 'globalThis.VOZEN_DOCS_NAV=globalThis.VOZEN_DOCS_NAV||{};globalThis.VOZEN_DOCS_NAV.helper=' + JSON.stringify(manifest) + ';\n');
const mini = path.resolve('node_modules/minisearch/dist/umd/index.js');if(fs.existsSync(mini)){fs.copyFileSync(mini,path.join(output,'assets/minisearch.js'));}
console.log(`Indexed ${documents.length} documentation pages`);
