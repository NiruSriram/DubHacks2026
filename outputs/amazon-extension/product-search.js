export function productQuery(item){
 const title=item.name.split('|')[0].trim(),variant=String(item.variant||'').replace(/ASIN\s+[A-Z0-9]{10}\s*[·-]?/g,'').replace(/confirm (selected )?variant|selected item/gi,'').trim();
 const models=title.match(/\b(?=[A-Z0-9-]*[A-Z])(?=[A-Z0-9-]*\d)[A-Z][A-Z0-9-]{3,}\b/ig)||[];
 if(models.length===1){const brand=title.split(/\s+/)[0],colors=item.name.match(/\b(black|white|blue|red|green|pink|purple|silver|gold|gray|grey|beige)\b/ig)||[],specs=title.match(/\b\d+(?:\.\d+)?\s*(?:GB|TB|oz|ml|inch|count|pack)\b/ig)||[];return[...new Map([brand,models[0],...colors,...specs,variant].join(' ').split(/\s+/).filter(Boolean).map(x=>[x.toLowerCase(),x])).values()].join(' ').slice(0,240);}
 return(title+' '+variant).trim().slice(0,240);
}
