# Later

Good things come to those who wait.

Cobalt #2456F5, ink #16171B, white #FFFFFF, canvas #F7F8FC. System sans typography. Large controls, restrained borders, rounded cards. Bootstrap 5.3.8 is bundled locally with its MIT license. No external font or framework CDN needed.

Shopper: cart, purchase preferences, scenario estimate and Visa-hosted card entry. Merchant: searchable intent table, real local counts, offer composer. The layout borrows familiar campaign-manager patterns without connecting to an advertising network.

## Waiting-price model

The calculator is an economic scenario, not trained prediction or live pricing. The cart budget is the reference price. Adjustable inputs: gross margin, retained margin, acquisition cost avoided, eligible offers/hour, and waiting cost/hour. Merchant gross margin must include the appropriate cost basis; fulfillment, payment fees and returns need to be reflected in the assumed margins/reserve.

Maximum discount C = max(0, min(reference price × (gross margin − retained margin), avoided CAC)). Offer arrivals N follow Poisson(rate × waiting hours). Conditional offer discounts are assumed independently uniform on [0,C]. Expected best discount, including zero arrivals, is C × (1 − (1 − exp(−λ))/λ), with zero savings at λ=0. Compare 15 minutes, 1 hour and 12 hours; recommend the highest expected savings less the shopper’s stated waiting cost. The floor is a model bound, not an available merchant quote. No actual price guarantee or authorization reduction is made.

Merchant participation, cost distributions, inventory and incremental conversion must be measured before treating outputs as forecasts. Current defaults are explicitly illustrative. There is no ad exchange or sponsored bidding.
