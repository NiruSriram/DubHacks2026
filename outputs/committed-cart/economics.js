// Scenario model, not a market quote. Prices are integer cents.
export function estimateWait({price,margin,retainedMargin,cac,offersPerHour,hours,waitCostPerHour=0}){
 for(const x of [price,margin,retainedMargin,cac,offersPerHour,hours,waitCostPerHour])if(!Number.isFinite(x)||x<0)throw new Error('Use non-negative assumptions');
 if(price<=0||margin>100||retainedMargin>100)throw new Error('Invalid price or margin');
 // Reserve merchant profit, and never assume more discount than avoided acquisition spend.
 const cap=Math.max(0,Math.min(price*(margin-retainedMargin)/100,cac*100));
 const lambda=offersPerHour*hours;
 // N~Poisson(lambda); each discount ~Uniform(0,cap). E[max discounts] includes N=0.
 const expectedDiscount=lambda<1e-5?cap*(lambda/2-lambda*lambda/6):cap*(1+Math.expm1(-lambda)/lambda);
 return{floor:Math.round(price-cap),expectedPrice:Math.round(price-expectedDiscount),expectedSavings:Math.round(expectedDiscount),offerProbability:-Math.expm1(-lambda),netBenefit:Math.round(expectedDiscount-waitCostPerHour*hours*100),cap:Math.round(cap)};
}
