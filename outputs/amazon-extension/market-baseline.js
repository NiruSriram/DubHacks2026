export const itemKey=item=>JSON.stringify([item.name,item.variant,item.url||'',Number(item.quantity),String(item.price)]);
export function lowerOffers(offers,reference){return Number.isFinite(reference)&&reference>0?offers.filter(x=>Number.isInteger(x.price)&&x.price>0&&x.price<reference):[];}
export function cartBaseline(items,prices={}){return items.reduce((sum,item)=>{const budget=Math.round(Number(item.price)*100),quote=prices[itemKey(item)];return sum+Math.min(budget,Number.isInteger(quote)&&quote>0?quote:budget)*Number(item.quantity);},0);}
