import fs from 'node:fs';
import { createHash } from 'node:crypto';
const [origin, output] = process.argv.slice(2);
const routes=['/','/ads.txt','/api/clinics-links-manifest.json','/api/status-override?slug=hems-una-heredia','/api/status-override/?slug=hems-una-heredia','/favicon.svg'];
const results=[];
for(const route of routes){const r=await fetch(origin+route,{redirect:'manual'});const body=await r.text();results.push({route,status:r.status,contentType:r.headers.get('content-type'),location:r.headers.get('location'),bytes:Buffer.byteLength(body),sha256:createHash('sha256').update(body).digest('hex'),sample:body.slice(0,180)});}
fs.writeFileSync(output,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
