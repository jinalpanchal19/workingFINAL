import React, { useState } from 'react';
import { useProject } from '@/lib/ProjectContext';
import View2D from './View2D';
import View3D from './View3D';
import { comparePlans, explainComparison, savingsLabel } from '@/lib/optimizationComparison';
import { areaInUnit } from '@/lib/geometry';
import { STRATEGY_NAMES } from '@/components/analytics/StrategySelector';
const num = (v,d = 1) => Number.isFinite(v) ? v.toFixed(d) : 'Unavailable';
export default function BeforeAfter() {
  const { plans } = useProject();
  const [pair,setPair] = useState('baseline,most_efficient');
  const [mode,setMode] = useState('2d'), [sheet,setSheet] = useState(0), [toggle,setToggle] = useState(false), [side,setSide] = useState(0);
  if (!plans) return null;
  const keys = pair.split(','), before = plans[keys[0]], after = plans[keys[1]], comparison = comparePlans(before,after);
  return <div className="bg-[#F4F7F5] rounded-2xl border border-[#E2E8E4] p-4 space-y-4">
    <h3 className="font-display font-bold text-[#172B21]">Before / After & Compare Modes</h3>
    <div className="flex flex-wrap gap-2">{[['baseline,most_efficient','Baseline vs. Most Efficient'],['baseline,fastest','Baseline vs. Fastest'],['most_efficient,fastest','Most Efficient vs. Fastest']].map(([id,label]) => <button key={id} aria-pressed={pair === id} onClick={() => {setPair(id);setSheet(0);}} className={`px-3 py-2 rounded-lg text-xs font-semibold ${pair === id ? 'bg-[#123D26] text-white' : 'bg-white text-[#64748B]'}`}>{label}</button>)}</div>
    <div className="flex gap-2">{['2d','3d'].map(v => <button key={v} onClick={() => setMode(v)} className={`border rounded-lg px-3 py-1 ${mode === v ? 'bg-emerald-100' : 'bg-white'}`}>{v.toUpperCase()}</button>)}<button onClick={() => setToggle(v => !v)} className="border rounded-lg px-3 py-1">{toggle ? 'Side by side' : 'Toggle view'}</button>{toggle && <button onClick={() => setSide(v => 1-v)} className="border rounded-lg px-3 py-1">Switch panel</button>}</div>
    <div className="grid lg:grid-cols-2 gap-3">{keys.filter((_,i) => !toggle || i === side).map(key => {
      const data = plans[key], s = data.stats, View = mode === '2d' ? View2D : View3D;
      return <div key={key} className="bg-white rounded-xl border border-[#E2E8E4] p-3">
        <h4 className="font-bold text-[#15803D]">{STRATEGY_NAMES[key]}</h4><p className="text-xs text-[#64748B] mb-2">{data.status} · Geometry {data.valid ? 'valid' : 'invalid'} · {data.algorithm}</p>
        {data.valid && <View layoutData={data} synchronizedSheet={sheet} onSheetChange={setSheet} height={340} />}
        <div className="grid grid-cols-2 gap-2 text-xs mt-3">{[['Sheets consumed / purchased',`${s.sheetsUsed} / ${s.purchasedSheets}`],['Utilization',`${num(s.utilization)}%`],['Waste',`${num(s.waste)}%`],['Material cost',data.status === 'complete' ? `$${num(s.totalCost,2)}` : 'Incomplete job'],['Geometric leftover (cm²)',num(areaInUnit(s.leftoverArea,'cm'),0)],
          [`Cutting operations — ${s.cuttingMetricStatus}`,s.cuttingOperations ?? 'Unavailable'],[`Cutting distance (mm) ? ${s.cuttingMetricStatus}`,num(s.cutLengthMm,0)],['Complexity — Relative estimate',num(s.complexityScore)],['Production time — Estimated',s.estimatedCuttingTimeMinutes === null ? 'Unavailable' : `${num(s.estimatedCuttingTimeMinutes)} min`],['Labor cost — Estimated',s.estimatedLaborCost === null ? 'Unavailable' : `$${num(s.estimatedLaborCost,2)}`],['Job cost — Material & labor',s.totalJobCost === null ? 'Unavailable' : `$${num(s.totalJobCost,2)}`],['Rotated placements',s.rotations],['Orientation events — Estimated',s.rotationEvents],['Repositions — Estimated',s.repositioningCount],['Unplaced',s.unplacedCount],['Savings vs. baseline',savingsLabel(comparePlans(plans.baseline,data)?.savings)]].map(([label,value]) => <div key={label} className="rounded-lg bg-[#F4F7F5] p-2"><span className="text-[#64748B]">{label}</span><div className="font-semibold">{value}</div></div>)}</div>
        <details className="text-xs text-[#64748B] mt-3"><summary className="cursor-pointer font-semibold">Metric methodology & assumptions</summary><p className="mt-2">{s.cuttingModel}</p><p className="mt-2">{s.complexityExplanation}</p><p className="mt-2">{s.processExplanation}</p><p className="mt-2">{s.jobCostUnavailableReason || s.timeExplanation}</p><p className="mt-2">{s.sheetCostBasis}</p></details>
      </div>;
    })}</div>
    <p className="text-sm text-[#15803D]">{explainComparison(before,after)}</p>
    <p className="text-xs text-[#64748B]">Piece selection is shared between strategies, 2D, 3D and the inspector. Cut counts are validated only when an independently checked cutting sequence exists; otherwise they are separate-edge process estimates.</p>
  </div>;
}
