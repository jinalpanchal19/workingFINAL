import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RefreshCw, Save, AlertTriangle, Ruler, Crosshair } from 'lucide-react';
import { useProject } from '@/lib/ProjectContext';
import { fromMm, toMm } from '@/lib/geometry';

export default function ScrapScanner() {
  const { addPiece, material } = useProject();
  const u = material.unit;
  const [mode, setMode] = useState('idle'); // idle | camera | review
  const [stream, setStream] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [img, setImg] = useState(null);
  const [points, setPoints] = useState([]); // 4 corners
  const [refPts, setRefPts] = useState([]); // 2 reference points
  const [refLen, setRefLen] = useState(100); // mm
  const [manualW, setManualW] = useState('');
  const [manualH, setManualH] = useState('');
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => () => { if (stream) stream.getTracks().forEach((t) => t.stop()); }, [stream]);

  const startCamera = async () => {
    setError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      setMode('camera');
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 100);
    } catch (e) {
      setError('Camera unavailable or permission denied. You can upload a photo instead.');
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    const url = c.toDataURL('image/jpeg', 0.9);
    setImgUrl(url);
    setImg(new Image());
    img.src = url;
    setMode('review');
    setPoints([]);
    setRefPts([]);
    stopCamera();
  };

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImgUrl(reader.result);
      const image = new Image();
      image.onload = () => setImg(image);
      image.src = reader.result;
      setMode('review');
      setPoints([]);
      setRefPts([]);
    };
    reader.readAsDataURL(file);
  };

  const onCanvasClick = (e) => {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * c.width;
    const y = ((e.clientY - rect.top) / rect.height) * c.height;
    if (points.length < 4) {
      setPoints([...points, { x, y }]);
    } else if (refPts.length < 2) {
      setRefPts([...refPts, { x, y }]);
    }
    drawOverlay();
  };

  const drawOverlay = () => {
    if (!imgUrl || !canvasRef.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    // corners
    if (points.length) {
      ctx.strokeStyle = '#16A34A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      points.forEach((p, i) => { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
      if (points.length === 4) ctx.closePath();
      ctx.stroke();
      points.forEach((p, i) => {
        ctx.fillStyle = '#16A34A';
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter'; ctx.fillText(String(i + 1), p.x - 4, p.y - 12);
      });
    }
    // reference
    if (refPts.length === 2) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(refPts[0].x, refPts[0].y); ctx.lineTo(refPts[1].x, refPts[1].y); ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  useEffect(() => { drawOverlay(); }, [points, refPts, imgUrl]);

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const measurement = React.useMemo(() => {
    if (points.length !== 4 || refPts.length !== 2 || !refLen) return null;
    const refPx = dist(refPts[0], refPts[1]);
    if (refPx < 1) return null;
    const scale = refLen / refPx; // mm per px
    const w = dist(points[0], points[1]) * scale;
    const h = dist(points[1], points[2]) * scale;
    return { w, h };
  }, [points, refPts, refLen]);

  const finalW = manualW ? toMm(Number(manualW) || 0, u) : measurement?.w || 0;
  const finalH = manualH ? toMm(Number(manualH) || 0, u) : measurement?.h || 0;

  const saveScrap = () => {
    addPiece({ name: 'Scrap piece', width: Math.round(finalW), height: Math.round(finalH), quantity: 1, rotationAllowed: true });
    setMode('idle');
    setImgUrl(null);
    setPoints([]);
    setRefPts([]);
    setManualW(''); setManualH('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#172B21]">Smart Scrap Scanner</h1>
        <p className="text-sm text-[#64748B] mt-1">Measure a rectangular scrap piece from a photo using a reference object of known length.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        Measurements are estimates from a calibrated photo, not exact. Photograph flat from above with a ruler visible. Always verify before cutting.
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-[#DC2626] rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

      {mode === 'idle' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={startCamera} className="bg-white rounded-2xl border-2 border-[#E2E8E4] hover:border-[#16A34A] p-8 text-center transition">
            <Camera className="w-10 h-10 text-[#15803D] mx-auto mb-3" />
            <div className="font-semibold text-[#172B21]">Open camera</div>
            <div className="text-xs text-[#64748B] mt-1">Photograph the scrap live</div>
          </button>
          <button onClick={() => fileRef.current?.click()} className="bg-white rounded-2xl border-2 border-[#E2E8E4] hover:border-[#16A34A] p-8 text-center transition">
            <Upload className="w-10 h-10 text-[#15803D] mx-auto mb-3" />
            <div className="font-semibold text-[#172B21]">Upload photo</div>
            <div className="text-xs text-[#64748B] mt-1">Choose an image file</div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </div>
      )}

      {mode === 'camera' && (
        <div className="bg-white rounded-2xl border border-[#E2E8E4] p-4">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl bg-black" style={{ maxHeight: 400 }} />
          <div className="flex items-center justify-center gap-3 mt-3">
            <button onClick={capture} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#16A34A] text-white font-semibold hover:bg-[#15803D]"><Camera className="w-4 h-4" /> Capture</button>
            <button onClick={() => { stopCamera(); setMode('idle'); }} className="px-4 py-2.5 rounded-lg border border-[#E2E8E4] text-[#64748B] hover:bg-[#F4F7F5]">Cancel</button>
          </div>
        </div>
      )}

      {mode === 'review' && imgUrl && (
        <div className="bg-white rounded-2xl border border-[#E2E8E4] p-4">
          <canvas ref={canvasRef} onClick={onCanvasClick} className="w-full rounded-xl cursor-crosshair" />
          <div className="mt-4 space-y-3">
            <div className="text-sm text-[#64748B]">
              {points.length < 4
                ? <span className="flex items-center gap-1.5"><Crosshair className="w-4 h-4 text-[#16A34A]" /> Click the 4 corners of the scrap in order ({points.length}/4)</span>
                : refPts.length < 2
                ? <span className="flex items-center gap-1.5"><Ruler className="w-4 h-4 text-amber-500" /> Click the two ends of a reference object of known length ({refPts.length}/2)</span>
                : <span className="text-[#15803D] font-medium">Measurement ready — review and correct below.</span>}
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-[#64748B]">Reference length:</label>
              <input type="number" min={1} value={refLen} onChange={(e) => setRefLen(Math.max(1, Number(e.target.value) || 1))} className="w-24 px-2 py-1.5 rounded-lg border border-[#E2E8E4] text-sm" />
              <span className="text-sm text-[#64748B]">mm</span>
            </div>
            {measurement && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Detected width ({u})</label>
                  <input type="number" value={manualW || Number(fromMm(measurement.w, u)).toFixed(u === 'mm' ? 0 : 1)} onChange={(e) => setManualW(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-[#E2E8E4] text-sm" placeholder="Correct if needed" />
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Detected height ({u})</label>
                  <input type="number" value={manualH || Number(fromMm(measurement.h, u)).toFixed(u === 'mm' ? 0 : 1)} onChange={(e) => setManualH(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-[#E2E8E4] text-sm" placeholder="Correct if needed" />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button onClick={saveScrap} disabled={!finalW || !finalH} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#16A34A] text-white font-semibold hover:bg-[#15803D] disabled:opacity-40"><Save className="w-4 h-4" /> Save as piece</button>
              <button onClick={() => { setPoints([]); setRefPts([]); setManualW(''); setManualH(''); }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#E2E8E4] text-[#64748B] hover:bg-[#F4F7F5]"><RefreshCw className="w-4 h-4" /> Redo points</button>
              <button onClick={() => { setMode('idle'); setImgUrl(null); }} className="px-4 py-2.5 rounded-lg border border-[#E2E8E4] text-[#64748B] hover:bg-[#F4F7F5]">Start over</button>
            </div>
            <p className="text-xs text-[#94A3B8]">Saving adds the scrap to your cut list on the Dashboard. It is not added automatically until you confirm.</p>
          </div>
        </div>
      )}
    </div>
  );
}
