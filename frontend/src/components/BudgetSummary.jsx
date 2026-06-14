import React from 'react';
import { Wallet, Info, Sparkles, AlertCircle, TrendingUp } from 'lucide-react';

export default function BudgetSummary({ budgetData, currency = 'INR' }) {
  if (!budgetData) return null;

  const total = budgetData.total_budget || budgetData.budget || 0;
  const travelers = budgetData.travelers || 1;
  const perPerson = budgetData.per_person_cost || roundCost(total / travelers);
  
  // Resolve breakdown items mapping
  const breakdown = budgetData.breakdown || {
    transport: { percentage: 30, amount: total * 0.3, description: "Flights, trains, cabs" },
    accommodation: { percentage: 40, amount: total * 0.4, description: "Hotel or homestays" },
    food: { percentage: 15, amount: total * 0.15, description: "Dining & street eats" },
    activities: { percentage: 10, amount: total * 0.1, description: "Entry tickets & tours" },
    savings: { percentage: 5, amount: total * 0.05, description: "Buffer savings" },
  };

  function roundCost(val) {
    return Math.round(val * 100) / 100;
  }

  const items = [
    { key: 'transport', label: 'Transport', color: 'bg-blue-500', barBg: 'bg-blue-100', data: breakdown.transport },
    { key: 'accommodation', label: 'Accommodation', color: 'bg-emerald-500', barBg: 'bg-emerald-100', data: breakdown.accommodation || breakdown.stay },
    { key: 'food', label: 'Food & Dining', color: 'bg-amber-500', barBg: 'bg-amber-100', data: breakdown.food },
    { key: 'activities', label: 'Activities', color: 'bg-purple-500', barBg: 'bg-purple-100', data: breakdown.activities },
    { key: 'savings', label: 'Buffer/Savings', color: 'bg-rose-500', barBg: 'bg-rose-100', data: breakdown.savings || breakdown.remaining_savings },
  ];

  const comfortLevel = budgetData.comfort_level || 'moderate';
  const distanceVal = budgetData.distance || 820;
  const currencySymbol = currency === 'INR' ? '₹' : '$';
  
  // Transport breakdown calculations
  const getTransportBreakdown = (level, travs, dist) => {
    const d = dist || 820;
    const t = travs || 1;
    
    if (level === 'budget') {
      const trainCost = 450 * t;
      const busCost = 150 * 5 * t;
      const autoCost = 100 * 5 * t;
      const routeFuelShare = Math.round(d * 2.5);
      return [
        { name: "Sleeper Class Train ticket", formula: `₹450 base fare × ${t} travelers`, cost: trainCost },
        { name: "Local buses & shared cabs", formula: `₹150 daily transit × 5 days × ${t} travelers`, cost: busCost },
        { name: "Local Auto-rickshaws", formula: `₹100 daily local fares × 5 days × ${t} travelers`, cost: autoCost },
        { name: "Route Fuel & Toll (Shared)", formula: `~${d} km OSRM route mileage share @ ₹2.5/km`, cost: routeFuelShare }
      ];
    } else if (level === 'luxury') {
      const flightCost = 5500 * t;
      const cabRental = 2800 * 6;
      const localGuides = 600 * t;
      const routeFuel = Math.round(d * 10);
      return [
        { name: "Domestic Economy Flight (Return)", formula: `₹5,500 avg ticket × ${t} travelers`, cost: flightCost },
        { name: "Private SUV Rental (Chauffeur-driven)", formula: `₹2,800 daily rental × 6 days (fully reserved)`, cost: cabRental },
        { name: "Pre-booked local guides & transfers", formula: `₹600 local activities transfer × ${t} travelers`, cost: localGuides },
        { name: "Route Fuel & Highway Tolls", formula: `~${d} km OSRM route driving @ ₹10/km`, cost: routeFuel }
      ];
    } else {
      // moderate / comfort
      const trainCost = 1250 * t; // AC 3 Tier
      const busCost = 250 * 6 * t;
      const cabCost = 1800 * 3;
      const routeFuel = Math.round(d * 6);
      return [
        { name: "AC 3 Tier Train ticket", formula: `₹1,250 AC sleeper ticket × ${t} travelers`, cost: trainCost },
        { name: "AC Buses & shared transfers", formula: `₹250 daily AC transfers × 6 days × ${t} travelers`, cost: busCost },
        { name: "Private Cabs (Select sightseeing days)", formula: `₹1,800 private cab × 3 selected sightseeing days`, cost: cabCost },
        { name: "Route Fuel & Tolls (Sedan)", formula: `~${d} km OSRM route driving @ ₹6/km`, cost: routeFuel }
      ];
    }
  };

  const transportItems = getTransportBreakdown(comfortLevel, travelers, distanceVal);
  const totalTransportSum = breakdown.transport?.amount || 0;
  
  // Adjust the last item's cost to absorb any difference so the sum matches totalTransportSum exactly
  const sumBeforeLast = transportItems.slice(0, -1).reduce((sum, item) => sum + item.cost, 0);
  const lastItemIndex = transportItems.length - 1;
  if (lastItemIndex >= 0) {
    transportItems[lastItemIndex].cost = Math.max(0, totalTransportSum - sumBeforeLast);
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/85 p-7 sm:p-8 mb-8 shadow-premium overflow-visible">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-xs">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-tight text-travel-text-primary">Budget Analysis Breakdown</h3>
            <p className="text-2xs text-travel-text-muted">Smart expenditure distribution based on preferences</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="bg-white/80 border border-emerald-100/80 rounded-xl px-4 py-2 text-left min-w-[100px] shadow-xs">
            <span className="text-3xs uppercase tracking-wider font-semibold text-travel-text-muted block">Total Trip Cost</span>
            <span className="text-sm font-bold text-travel-text-primary">{currencySymbol}{total.toLocaleString()}</span>
          </div>
          <div className="bg-white/80 border border-emerald-100/80 rounded-xl px-4 py-2 text-left min-w-[100px] shadow-xs">
            <span className="text-3xs uppercase tracking-wider font-semibold text-travel-text-muted block">Per Person</span>
            <span className="text-sm font-bold text-emerald-700">{currencySymbol}{perPerson.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Breakdown Progress Bars */}
      <div className="space-y-4 mb-6">
        <div className="flex h-3.5 w-full rounded-full overflow-hidden bg-travel-bg-gray">
          {items.map((item) => {
            if (!item.data) return null;
            const pct = item.data.percentage || 0;
            if (pct <= 0) return null;
            return (
              <div 
                key={item.key}
                className={`${item.color} h-full transition-all duration-300`}
                style={{ width: `${pct}%` }}
                title={`${item.label}: ${pct}%`}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            if (!item.data) return null;
            const pct = item.data.percentage || 0;
            const amt = item.data.amount || 0;
            return (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-white/60 border border-emerald-100/50 hover:bg-white hover:border-emerald-200 transition shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className={`h-3 w-3 rounded-full ${item.color} shrink-0`} />
                  <div>
                    <span className="text-2xs font-semibold block text-travel-text-primary">{item.label}</span>
                    <span className="text-3xs text-travel-text-muted">{item.data.description || 'General expenditure'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xs font-bold text-travel-text-primary block">{currencySymbol}{Math.round(amt).toLocaleString()}</span>
                  <span className="text-3xs text-travel-text-muted font-medium">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Transport Cost Breakdown */}
      <div className="mb-6">
        <h4 className="text-2xs font-bold uppercase tracking-wider text-travel-text-primary mb-3 flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          Detailed Transport Cost Breakdown ({comfortLevel === 'luxury' ? 'Premium' : comfortLevel === 'budget' ? 'Budget' : 'Comfort'} Mode)
        </h4>
        <div className="overflow-hidden border border-emerald-200/50 rounded-xl bg-white/70 shadow-xs">
          <table className="w-full text-left border-collapse text-2xs">
            <thead>
              <tr className="bg-emerald-100/30 border-b border-emerald-150 text-travel-text-primary font-extrabold uppercase tracking-wider">
                <th className="p-3">Transport Item</th>
                <th className="p-3">Pricing Details & Formula</th>
                <th className="p-3 text-right">Estimated Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/40 font-medium text-travel-text-secondary">
              {transportItems.map((tItem, idx) => (
                <tr key={idx} className="hover:bg-white/40 transition">
                  <td className="p-3 font-bold text-travel-text-primary">{tItem.name}</td>
                  <td className="p-3">{tItem.formula}</td>
                  <td className="p-3 text-right font-black text-travel-text-primary">{currencySymbol}{Math.round(tItem.cost).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-emerald-50/60 font-black border-t border-emerald-200 text-emerald-850">
                <td className="p-3">Total Transport Cost</td>
                <td className="p-3">Sum of transit and fuel route expenditures</td>
                <td className="p-3 text-right">{currencySymbol}{Math.round(totalTransportSum).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Smart optimization recommendations */}
      {budgetData.tips && budgetData.tips.length > 0 && (
        <div className="rounded-xl border border-travel-accent-green bg-travel-accent-green/20 p-4">
          <h4 className="text-2xs font-bold text-travel-text-primary mb-2.5 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Budget Optimization Insights
          </h4>
          <ul className="space-y-2 text-2xs text-travel-text-secondary">
            {budgetData.tips.map((tip, idx) => (
              <li key={idx} className="flex gap-2 items-start">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}
