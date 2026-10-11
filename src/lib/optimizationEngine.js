import { detectOffcuts } from './offcutGeometry.js';
import { packMixed } from './mixedStockOptimizer.js';
import { compatible } from './reuseInventory.js';
import { baselineLayout } from './optimizer.js';
import { optimizeEfficient } from './efficientOptimizer.js';
import { fastCutLayout } from './guillotinePlanner.js';
import { validateInputs, validatePlan, expandPieces } from './planValidation.js';
import { computeStats } from './geometry.js';
import { estimateCutting } from './cuttingProcessModel.js';
import { reconstructCuttingTrees } from './cuttingSequence.js';

export function runStrategies(material,pieces,assumptions = {}, stock = [], projectId = null) {
  const sheet = { width: Number(material.sheetWidth), height: Number(material.sheetHeight) };
  const opts = { kerf: Number(material.kerf), margin: Number(material.edgeMargin), maxSheets: Number(material.sheetQuantity), rotationAllowedGlobal: material.rotationAllowed };
  const offcuts=stock.filter(o=>compatible(o,material,projectId));
  const newSheetPlans=offcuts.length ? runStrategies(material,pieces,assumptions) : null;
  const inputs = validateInputs(sheet,pieces,opts);
  if(new Set(offcuts.map(o=>o.id)).size!==offcuts.length){inputs.valid=false;inputs.errors.push('Duplicate physical stock IDs.');}
  const score = plan => { const e = estimateCutting(plan,assumptions,true); return e.estimatedCuttingTimeMinutes ?? e.complexityScore; };
  const methods = { baseline: baselineLayout, most_efficient: optimizeEfficient, fastest: (s,p,o) => fastCutLayout(s,p,o,score) };
  const results = {};
  for (const [strategy,method] of Object.entries(methods)) {
    /** @type {any} */
    let plan = inputs.valid ? { ...(offcuts.length ? packMixed(method,sheet,pieces,opts,strategy,offcuts,assumptions) : method(sheet,pieces,opts)), strategy } : { strategy, algorithm: 'Invalid input', sheets: [], unplaced: [] };
    let validation = inputs.valid ? validatePlan(plan,sheet,pieces,{...opts,stocks:plan.stocks}) : inputs;
    if (inputs.valid && validation.valid && strategy !== 'fastest' && !offcuts.length) {
      const reconstructed = reconstructCuttingTrees(plan,opts);
      if (reconstructed) {
        const sequenceCheck = validatePlan(reconstructed,sheet,pieces,opts);
        if (sequenceCheck.valid) {plan=reconstructed;validation=sequenceCheck;}
      }
    }
    const sequenceValidated = validation.valid && (strategy === 'fastest' || plan.hasCuttingTree === true);
    let additionalSheetsFound = null;
    if (inputs.valid && plan.unplaced.length && strategy !== 'baseline' && !offcuts.length) {
      const trial = method(sheet,pieces,{ ...opts, maxSheets: Math.max(opts.maxSheets,expandPieces(pieces).length) });
      if (!trial.unplaced.length && validatePlan({ ...trial,strategy },sheet,pieces,{ ...opts,maxSheets: trial.sheets.length }).valid) additionalSheetsFound = Math.max(0,trial.sheets.length-opts.maxSheets);
    }
    plan.validation = validation;
    const raw = computeStats(plan,sheet,pieces,material.pricePerSheet,{...assumptions,unit:material.unit,sequenceValidated});
    const stats = {...raw,leftoverArea:raw.leftoverAreaMm2,totalSheetArea:raw.totalSheetAreaMm2,placedArea:raw.placedAreaMm2};
    if (!inputs.valid) {
      for (const key of ['utilization','waste','leftoverArea','totalCost','cuttingOperations','cutLengthMm','complexityScore','estimatedCuttingTimeMinutes','estimatedLaborCost','totalJobCost']) stats[key]=null;
      stats.areaError='Unavailable — Check Dimensions';stats.cuttingMetricStatus='Unavailable';
    }
    const status = !validation.valid ? 'invalid' : plan.unplaced.length ? 'incomplete' : 'complete';
    if (status !== 'complete') {stats.totalJobCost=null;stats.estimatedLaborCost=null;stats.laborCost=null;stats.jobCostUnavailableReason='Estimated job cost unavailable — this plan is incomplete or invalid.';}
    results[strategy] = { ...plan, valid: validation.valid, validation, sequenceValidated, status, stats, additionalSheetsFound };
    const detected=detectOffcuts(results[strategy],material,projectId ?? 'preview');
    stats.recoverableOffcutMm2=validation.valid ? detected.estimatedArea : null;
    const purchasedBaseline=newSheetPlans?.[strategy];
    results[strategy].avoidedPurchases = status==='complete' && purchasedBaseline?.status==='complete' && Number.isFinite(purchasedBaseline.stats.totalCost) && Number.isFinite(stats.totalCost) ? {sheets:purchasedBaseline.stats.purchasedSheets-stats.purchasedSheets,cost:purchasedBaseline.stats.totalCost-stats.totalCost,method:'Same cut list, material settings and strategy, with versus without selected existing stock; heuristic plans.'} : null;
  }
  return results;
}
