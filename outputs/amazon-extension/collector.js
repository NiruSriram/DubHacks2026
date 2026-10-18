// Injected only after the shopper clicks Read my cart. No background monitoring.
function collectAmazonCart() {
 if(!/(^|\.)amazon\.com$/.test(location.hostname)||location.protocol!=='https:')return{error:'Open an Amazon.com shopping cart first.'};
 if(!/^\/(?:gp\/(?:cart|aw\/c)|cart)(?:\/|$)/.test(location.pathname))return{error:'Open your Amazon shopping cart, then try again. Product pages and checkout are not supported.'};
 if(/^\/cart\/smart-wagon(?:\/|$)/.test(location.pathname))return{error:'This is Amazon’s Added to cart page. Open the full Shopping Cart to import selected items.',needsCartPage:true};
 const root=document.querySelector('#sc-active-cart')||document.querySelector('form#activeCartViewForm');
 if(!root)return{error:'The active cart could not be identified. Refresh Amazon or use manual entry in the local app.'};
 const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
 const items=[],seen=new Set();let skipped=0;
 for(const row of root.querySelectorAll('[data-asin].sc-list-item, [data-asin][data-item-index]')) {
  const asin=row.getAttribute('data-asin')||'';
  if(!/^[A-Z0-9]{10}$/.test(asin)||row.getAttribute('data-removed')==='true'||row.classList.contains('sc-list-item-removed'))continue;
  const key=row.getAttribute('data-itemid')||row.getAttribute('data-item-id')||asin;if(seen.has(key))continue;seen.add(key);
  const selection=row.querySelector('input[type="checkbox"][name="activeItems"], input[type="checkbox"][name^="activeItems"], .sc-item-selection-checkbox input[type="checkbox"]');
  if(selection&&!selection.checked){skipped++;continue;}
  const title=row.querySelector('.sc-product-title .a-truncate-full, .sc-product-link .a-truncate-full') || row.querySelector('.sc-product-title');
  const name=clean(title?.textContent);if(!name){skipped++;continue;}
  const quantityNode=row.querySelector('select[name^="quantity"], input[name^="quantity"], [data-a-selector="quantity"]');
  let quantity=Number(quantityNode?.value||row.getAttribute('data-quantity')||1);
  if(!Number.isInteger(quantity)||quantity<1||quantity>10){skipped++;continue;}
  const priceNode=row.querySelector('.sc-product-price, .sc-price, .a-price .a-offscreen');
  const raw=clean(priceNode?.textContent);let price='';
  if(/^(?:US\s*)?\$\s*[\d,]+(?:\.\d{2})?$/.test(raw)){const n=Number(raw.replace(/[^\d.]/g,''));if(n>0&&n<=500)price=n.toFixed(2);}
  const variations=[...row.querySelectorAll('.sc-product-variation')].map(n=>clean(n.textContent)).filter(Boolean).join(' · ');
  const imageNode=row.querySelector('img.sc-product-image, .sc-product-image img')||row.querySelector('img:not([src*=loadIndicators])');
  items.push({name:name.slice(0,180),variant:('ASIN '+asin+(variations?' · '+variations:' · confirm variant')).slice(0,180),quantity,price,url:'https://www.amazon.com/dp/'+asin,asin,image:imageNode?.currentSrc||imageNode?.src||''});
 }
 if(!items.length)return{error:'No selected, recognizable items found in the active cart. Select items in Amazon and retry, or enter them manually.'};
 return{items,skipped,source:'amazon.com',capturedAt:new Date().toISOString(),warning:'Displayed prices may omit tax, shipping, discounts or selected options. Confirm every item and all-in budget before authorization.'};
}

// Read only the active, user-selected page. Generic stores use public Product / ItemList metadata.
function collectShoppingPage(){
 const clean=x=>String(x||'').replace(/\s+/g,' ').trim();
 const imageURL=x=>{try{const u=new URL(typeof x==='string'?x:x?.url||'',location.href);return u.protocol==='https:'?u.href:'';}catch{return'';}};
 if(location.protocol!=='https:')return{error:'Open a product or shopping cart first.'};
 if(/(?:checkout|payment|account|signin|login)/i.test(location.pathname))return{error:'Open a product or cart page instead of checkout.'};
 if(location.hostname==='www.amazon.com'){
  if(/^\/(?:gp\/(?:cart|aw\/c)|cart)(?:\/|$)/.test(location.pathname))return collectAmazonCart();
  const asin=location.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/)?.[1];
  if(asin){if(document.querySelector('#usedOnlyBuybox, #usedOnlyBuybox_feature_div, #usedbuyBox'))return{error:'This listing is used. Open a new-condition product to compare.'};const name=clean(document.querySelector('#productTitle')?.textContent),raw=clean(document.querySelector('#corePrice_feature_div .a-price .a-offscreen, #corePriceDisplay_desktop_feature_div .a-price .a-offscreen, #priceblock_ourprice')?.textContent);const price=/^(?:US\s*)?\$\s*[\d,]+(?:\.\d{2})?$/.test(raw)?Number(raw.replace(/[^\d.]/g,'')):0;if(!name||!price)return{error:'Could not read this price. Try the full cart.'};const variations=[...document.querySelectorAll('#twister .selection, #twister_feature_div .selection')].map(n=>clean(n.textContent)).filter(Boolean);return{source:'amazon.com',capturedAt:new Date().toISOString(),items:[{name:name.slice(0,180),variant:('ASIN '+asin+' · '+(variations.join(' · ')||'Selected variant')).slice(0,180),quantity:Number(document.querySelector('select#quantity')?.value||1),price:price.toFixed(2),url:'https://www.amazon.com/dp/'+asin,image:document.querySelector('#landingImage, #imgBlkFront')?.src||''}]};}
 }
 const products=[],seen=new Set();
 function inspect(node,qty=1){
  if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(n=>inspect(n,qty));return;}
  const types=[node['@type']].flat();
  if(types.includes('Product')){
   const offer=Array.isArray(node.offers)?node.offers[0]:node.offers;
   // AggregateOffer's lowPrice is not an executable price and is intentionally unsupported.
   if(offer?.priceCurrency==='USD'&&Number(offer.price)>0){const url=imageURL(node.url||offer.url||location.href),key=node.sku||node.productID||url+node.name;if(!seen.has(key)){seen.add(key);const brand=typeof node.brand==='string'?node.brand:node.brand?.name||'';const heading=clean(document.querySelector('h1')?.textContent)||clean(node.name);const name=(brand&&!heading.toLowerCase().includes(brand.toLowerCase())?brand+' ':'')+heading;products.push({name:name.slice(0,180),variant:clean([node.model,node.color,node.size].filter(x=>typeof x==='string').join(' · ')||heading.split('|')[1]||'Selected item').slice(0,180),price:Number(offer.price).toFixed(2),quantity:Number(qty)||1,url,image:imageURL([node.image].flat()[0])});}}
   return;
  }
  if(node['@graph'])inspect(node['@graph']);
  if(types.includes('ItemList'))for(const entry of node.itemListElement||[])inspect(entry.item||entry,entry.quantity||1);
 }
 for(const script of document.querySelectorAll('script[type="application/ld+json"]')){try{inspect(JSON.parse(script.textContent));}catch{}}
 if(products.length===1)return{source:location.hostname,items:products,capturedAt:new Date().toISOString()};
 if(products.length>1)return{error:'Open a single product page on this store to compare it.'};
 return{error:'This store does not expose a readable price. Try a product page.'};
}
