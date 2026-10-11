import React from 'react';
import { TrendingUp, Percent, Layers, Package, PackageX, DollarSign, PiggyBank, Square } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts';
import { useProject } from '@/lib/ProjectContext';
import { areaInUnit, formatLeftoverArea } from '@/lib/geometry';
import Recommendation from './Recommendation';
import { comparePlans, explainComparison, savingsLabel, sheetsLabel } from '@/lib/optimizationComparison';

function MetricCard({ icon: Icon, label, value, sub = null, tone = 'green' }) {
  const tones = {
    green: 'bg-[#DCFCE7] text-[#15803D]',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-[#DC2626]',
    slate: 'bg-slate-100 text-[#475569]',
  };
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8E4] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[#64748B]" title={sub ?? undefined}>{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="font-display text-2xl font-bold text-[#172B21]">{value}</div>
      {sub && <div className="text-xs text-[#94A3B8] mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { layout, baseline, material, plans } = useProject();
  if (!layout) return null;

  const s = layout.stats;
  const fmt = (v, d = 1) => Number.isFinite(v) ? v.toFixed(d) : 'Unavailable';
  const comparison = comparePlans(baseline,layout);
  const all = [['baseline','Baseline'],['most_efficient','Efficient'],['fastest','Fastest']].map(([key,name]) => ({name, ...plans[key].stats, complete: plans[key].status === 'complete'}));
  const b = baseline?.stats;
  const u = material.unit;
  const areaUnit = u === 'in' ? 'inÃ‚²' : 'cmÃ‚²';

  const utilizationData = [
    { name: 'Used', value: Number.isFinite(s.utilization) ? Number(fmt(s.utilization)) : 0, color: '#16A34A' },
    { name: 'Waste', value: Number.isFinite(s.waste) ? Number(fmt(s.waste)) : 0, color: '#E2E8E4' },
  ];

  const beforeAfterUtil = all.map(s => ({name:s.name,utilization:s.complete ? s.utilization : null}));
  const costData = all.map(s => ({name:s.name,cost:s.complete ? s.totalCost : null}));
  const sheetData = all.map(s => ({name:s.name,sheets:s.complete ? s.sheetsUsed : null}));
  const savings = comparison?.savings ?? null;
  const savedSheets = comparison?.savedSheets ?? null;

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={Percent} label="Material utilization" value={`${fmt(s.utilization)}%`} tone="green" />
        <MetricCard icon={TrendingUp} label="Waste" value={`${fmt(s.waste)}%`} tone="amber" />
        <MetricCard icon={Layers} label="Sheets used" value={s.sheetsUsed} sub={`${s.purchasedSheets} purchased sheets; ${s.reusedOffcuts} existing offcuts`} tone="slate" />
        <MetricCard icon={Package} label="Pieces placed" value={s.placedCount} sub={`of ${s.totalPieces} total`} tone="green" />
        <MetricCard icon={PackageX} label="Unplaced pieces" value={s.unplacedCount} tone={s.unplacedCount ? 'red' : 'slate'} />
        <MetricCard icon={DollarSign} label="Material cost" value={`$${fmt(s.totalCost,2)}`} sub={layout.status === 'complete' ? `$${material.pricePerSheet} / sheet` : 'Partial layout cost - incomplete job'} tone="slate" />
        <MetricCard icon={PiggyBank} label="Material purchasing savings" value={savingsLabel(savings)} sub={comparison ? sheetsLabel(savedSheets) : 'Complete plans required'} tone={savings > 0 ? 'green' : 'slate'} />
        <MetricCard icon={Square} label="Leftover area" value={formatLeftoverArea(s.leftoverArea ?? s.leftoverAreaMm2,u === 'mm' ? 'cm' : u)}  sub={s.areaError || s.geometricLeftoverExplanation} tone="slate" />
      </div>

      <div className="text-xs text-[#475569] bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{explainComparison(baseline,layout)}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={Layers} label={`Cutting operations — ${s.cuttingMetricStatus}`} value={s.cuttingOperations ?? 'Unavailable'} sub={s.cuttingModel} />
        <MetricCard icon={Package} label="Repositioning — Estimated" value={s.repositioningCount ?? 'Unavailable'} sub={s.processExplanation} />
        <MetricCard icon={TrendingUp} label="Cutting complexity — Relative estimate" value={fmt(s.complexityScore)} sub={s.complexityExplanation} />
        <MetricCard icon={TrendingUp} label="Estimated production time" value={s.estimatedCuttingTimeMinutes === null ? 'Unavailable' : `${fmt(s.estimatedCuttingTimeMinutes)} min`} sub={s.timeExplanation} />
        <MetricCard icon={DollarSign} label="Estimated labor cost" value={s.estimatedLaborCost === null ? 'Unavailable' : `$${fmt(s.estimatedLaborCost,2)}`} />
        <MetricCard icon={DollarSign} label="Estimated job cost" value={s.totalJobCost === null ? 'Unavailable' : `$${fmt(s.totalJobCost,2)}`} sub={s.jobCostUnavailableReason || 'Includes purchased material and estimated labor only. Excludes overhead, electricity, tool wear and taxes.'} />
        <MetricCard icon={Square} label="Placed piece area" value={Number.isFinite(s.placedArea) ? `${fmt(s.placedArea/100,0)} cm²` : 'Unavailable — Check Dimensions'} sub="Finished rectangles only; excludes kerf." />
        <MetricCard icon={Square} label="Kerf loss — Validated model" value={Number.isFinite(s.kerfLossMm2) ? `${fmt(s.kerfLossMm2/100,1)} cm²` : 'Unavailable'} sub="Blade gap × cut distance in the verified tree; excludes margin trimming." />
        <MetricCard icon={Square} label="Estimated reusable offcuts" value={formatLeftoverArea(s.recoverableOffcutMm2, u === 'mm' ? 'cm' : u)} sub="Geometric candidates only; physical recovery requires confirmation." />
        <MetricCard icon={Layers} label={`Cutting distance — ${s.cuttingMetricStatus}`} value={s.cutLengthMm === null ? 'Unavailable' : `${fmt(s.cutLengthMm,0)} mm`} />
        <MetricCard icon={Package} label="Orientation events — Estimated" value={s.rotationEvents ?? 'Unavailable'} sub={`${s.rotations} rotated placements; orientation events replace reposition events.`} />
      </div>
      {layout.status !== 'complete' && <p className="text-sm text-amber-700">{layout.status}: results describe a partial plan. Complete-job comparison charts omit this strategy.</p>}
      <Recommendation />
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8E4] p-5">
          <h4 className="font-display font-semibold text-[#172B21] mb-1">Utilization</h4>
          <p className="text-xs text-[#64748B] mb-3">Placed area vs. geometric leftover</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={utilizationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {utilizationData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#16A34A]" /> Used {fmt(s.utilization)}%</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#E2E8E4]" /> Waste {fmt(s.waste)}%</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8E4] p-5">
          <h4 className="font-display font-semibold text-[#172B21] mb-1">Before / After utilization</h4>
          <p className="text-xs text-[#64748B] mb-3">Baseline, Most Efficient and Fastest</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={beforeAfterUtil}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F7F5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="utilization" fill="#16A34A" radius={[6, 6, 0, 0]} barSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8E4] p-5">
          <h4 className="font-display font-semibold text-[#172B21] mb-1">Cost comparison</h4>
          <p className="text-xs text-[#64748B] mb-3">Material purchasing cost</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F7F5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                <Bar dataKey="cost" radius={[6, 6, 0, 0]} barSize={48}>
                  <Cell fill="#94A3B8" />
                  <Cell fill="#16A34A" />
                  <Cell fill="#2563EB" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8E4] p-5">
          <h4 className="font-display font-semibold text-[#172B21] mb-1">Sheet usage</h4>
          <p className="text-xs text-[#64748B] mb-3">Sheets required by each method</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sheetData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F7F5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="sheets" radius={[6, 6, 0, 0]} barSize={48}>
                  <Cell fill="#94A3B8" />
                  <Cell fill="#123D26" />
                  <Cell fill="#2563EB" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {[
          {title:'Cutting Complexity Score — Relative Estimate',key:'complexityScore',unit:'score',description:'Lower is simpler. Comparisons are provisional when methodologies differ.'},
          {title:'Estimated Production Time — Minutes',key:'estimatedCuttingTimeMinutes',unit:'min',description:'Supported validated sequences only; unavailable estimates are omitted.'},
          {title:'Waste Percentage',key:'waste',unit:'%',description:'Full consumed sheet area is the denominator.'},
          {title:'Geometric Leftover (cm²)',key:'leftoverCm2',unit:'cm²',description:'Includes kerf and margins; recoverable offcuts are not measured.'}
        ].map(({title,key,unit,description}) => <div key={key} className="bg-white rounded-2xl border border-[#E2E8E4] p-5">
          <h4 className="font-display font-semibold text-[#172B21] mb-1">{title}</h4><p className="text-xs text-[#64748B] mb-3">{description}</p>
          {key === 'estimatedCuttingTimeMinutes' && !all.some(s => s.complete && Number.isFinite(s.estimatedCuttingTimeMinutes)) ? <p className="text-sm text-[#64748B] py-10">Unavailable — enter production settings for a supported cutting sequence.</p> :
          <div style={{height:200}}><ResponsiveContainer width="100%" height="100%"><BarChart data={all.map(s => ({name:s.name,[key]:s.complete ? key === 'leftoverCm2' ? areaInUnit(s.leftoverArea,'cm') : s[key] : null}))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={v => `${Number(v).toFixed(1)} ${unit}`} /><Bar dataKey={key} fill="#16A34A" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div>}
        </div>)}
      </div>
    </div>
  );
}
