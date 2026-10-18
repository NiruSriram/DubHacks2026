export function parseCatalogCSV(text){
 if(text.length>250000)throw new Error('CSV must be smaller than 250 KB.');
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted){quoted=false;}else if(!cell){quoted=true;}else throw new Error('Malformed CSV quoting.');}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('Unclosed CSV quote.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2||rows.length>201)throw new Error('CSV needs a header and 1–200 products.');
 const header=rows.shift().map(h=>h.replace(/^\uFEFF/,'').trim());for(const key of ['name','variant','unitPrice','cost','stock'])if(!header.includes(key))throw new Error('Missing CSV column: '+key);
 if(new Set(header).size!==header.length)throw new Error('Duplicate CSV headers.');
 return rows.map((r,i)=>{if(r.length!==header.length)throw new Error(`CSV row ${i+2} has the wrong number of columns.`);const p=Object.fromEntries(header.map((h,j)=>[h,r[j].trim()]));if(!p.name||!p.variant||!/^\d+(\.\d{1,2})?$/.test(p.unitPrice)||!/^\d+(\.\d{1,2})?$/.test(p.cost)||!/^\d+$/.test(p.stock))throw new Error(`Check product, price, cost and stock on CSV row ${i+2}.`);return{name:p.name,variant:p.variant,unitPrice:p.unitPrice,cost:p.cost,stock:Number(p.stock),url:p.url||''};});
}
