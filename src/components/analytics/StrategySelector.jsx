import React from 'react';
import { Leaf, Zap } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
export const STRATEGY_NAMES = { baseline: 'Baseline', most_efficient: 'Most Efficient', fastest: 'Fastest' };
export default function StrategySelector({ settings = false }) {
  const { strategy,setStrategy,assumptions,setAssumptions } = useProject();
  return <div className="space-y-3 mb-5">
    {settings && <details className="rounded-xl border border-[#E2E8E4] p-3"><summary className="text-sm font-semibold cursor-pointer">Production Settings — Estimate Time & Labor Cost</summary><p className="text-xs text-[#64748B] my-3">Enter speed, setup, reposition and rotation times to estimate production time for a validated sequence. Add labor rate to estimate job cost. Blank values stay unavailable. Estimates exclude margin trimming and overhead; complexity is a relative score, not time.</p><div className="grid sm:grid-cols-3 gap-3">
      {[['laborRate','Hourly labor rate ($/hour)','e.g. 30'],['cuttingSpeed','Cutting speed (mm/min)','e.g. 3000'],['setupMinutes','Setup time (minutes/sheet)','e.g. 2'],['repositionSeconds','Reposition time (seconds/event)','e.g. 10'],['rotationSeconds','Rotation time (seconds/event)','e.g. 8']].map(([key,label,placeholder]) => <label key={key} className="text-xs text-[#64748B]">{label}<input type="number" min="0" step="any" value={assumptions[key] ?? ''} onChange={e => setAssumptions(prev => ({...prev,[key]:e.target.value}))} className="block mt-1 w-full border rounded-lg p-2 text-[#172B21]" placeholder={placeholder} /></label>)}
      <label className="text-xs text-[#64748B]">Machine type (optional)<input value={assumptions.machineType ?? ''} onChange={e => setAssumptions(prev => ({...prev,machineType:e.target.value}))} className="block mt-1 w-full border rounded-lg p-2" /></label>
    </div></details>}
    <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Optimization strategy"><legend className="text-sm font-semibold text-[#172B21] mb-3">Choose your optimization strategy</legend>
      {[{ id:'most_efficient', title:'Most Efficient', subtitle:'Save Money', icon:Leaf, description:'Minimize sheet usage and material purchasing cost with MaxRects packing, respecting your kerf and rotation rules.' },{ id:'fastest',title:'Fastest',subtitle:'Save Time',icon:Zap,description:'Find physically executable guillotine cuts with lower modeled manufacturing time or cutting complexity.' }].map(({id,title,subtitle,icon:Icon,description}) => <button type="button" key={id} aria-label={`${title} - ${subtitle}`} aria-pressed={strategy === id} onClick={() => setStrategy(id)} className={`text-left rounded-xl border-2 p-4 transition ${strategy === id ? id === 'fastest' ? 'border-blue-500 bg-blue-50' : 'border-emerald-500 bg-emerald-50' : 'border-[#E2E8E4] bg-white hover:bg-[#F4F7F5]'}`}>
        <Icon className={`w-6 h-6 mb-2 ${id === 'fastest' ? 'text-blue-600' : 'text-emerald-600'}`} /><div className="font-bold text-[#172B21]">{title}</div><div className="text-sm font-medium text-[#475569]">{subtitle}</div><p className="text-xs text-[#64748B] mt-2">{description}</p>
      </button>)}
    </fieldset>
    <p className="text-xs text-[#64748B]">{strategy === 'fastest' ? 'Prioritizes cutting time or complexity. Additional sheets may simplify manufacturing.' : 'Prioritizes complete placement, fewer sheets, then larger contiguous leftover regions; recoverable scrap is not measured.'}</p>

  </div>;
}
