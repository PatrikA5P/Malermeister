import React, { useRef, useState, useEffect } from "react";
import { processRoomRequest } from "../geminiService";

type Status = "idle" | "ready" | "ai" | "processing";

interface Segment {
  id: string;
  color: string;
  mask: Uint8Array; // Binäre Maske der selektierten Fläche
  pathData: string; // SVG Kontur für die UI-Anzeige
}

interface MaskBuffer {
  width: number;
  height: number;
  data: Uint8Array;
}

const BORER_PALETTE = [
  { name: "Olive", hex: "#7c8d2f" },
  { name: "Schiefer", hex: "#3a3b35" },
  { name: "Kalk", hex: "#f4f4f0" },
  { name: "Sand", hex: "#d4c9b1" },
  { name: "Bordeaux", hex: "#6b2020" },
  { name: "Nachtblau", hex: "#1e293b" },
  { name: "Terracotta", hex: "#a35c3d" },
  { name: "Beton", hex: "#8e908c" }
];

const SVG_SIZE = 1000;
const WORK_RES = 800; // Interne Auflösung für die Bildverarbeitung

// ----------------------- HELPER: FARBRAUM KONVERTIERUNG (Lab) -----------------------

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToLab(r: number, g: number, b: number) {
  let [R, G, B] = [r / 255, g / 255, b / 255].map(v => 
    v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92
  );
  let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.00000;
  let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  [X, Y, Z] = [X, Y, Z].map(v => v > 0.008856 ? Math.pow(v, 1/3) : (7.787 * v) + (16/116));
  return { L: (116 * Y) - 16, a: 500 * (X - Y), b: 200 * (Y - Z) };
}

function labToRgb(L: number, a: number, b: number) {
  let y = (L + 16) / 116, x = a / 500 + y, z = y - b / 200;
  [x, y, z] = [x, y, z].map(v => Math.pow(v, 3) > 0.008856 ? Math.pow(v, 3) : (v - 16/116) / 7.787);
  let R = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let G = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let B = x * 0.0557 + y * -0.2040 + z * 1.0570;
  [R, G, B] = [R, G, B].map(v => {
    v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1/2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(v * 255)));
  });
  return { r: R, g: G, b: B };
}

// ----------------------- HELPER: IMAGE PROCESSING -----------------------

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  return img;
}

async function prepareImage(url: string, size: number, type: "image/png" | "image/jpeg"): Promise<string> {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL(type);
}

function isKeyColor(r: number, g: number, b: number) {
  // Erkennt das Key-Gelb (#FFD500) auch in Schatten (Verhältnis-basiert)
  const dist = Math.sqrt((r - 255) ** 2 + (g - 213) ** 2 + b ** 2);
  if (dist < 80) return true;
  return r > b * 1.8 && g > b * 1.5 && r > 40;
}

async function createBinaryMask(url: string): Promise<MaskBuffer> {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = WORK_RES; canvas.height = WORK_RES;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, WORK_RES, WORK_RES);
  const { data } = ctx.getImageData(0, 0, WORK_RES, WORK_RES);
  const bin = new Uint8Array(WORK_RES * WORK_RES);
  for (let i = 0; i < bin.length; i++) {
    bin[i] = isKeyColor(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) ? 1 : 0;
  }
  return { width: WORK_RES, height: WORK_RES, data: bin };
}

function floodFill(buffer: MaskBuffer, vbX: number, vbY: number) {
  const { width: w, height: h, data: mask } = buffer;
  const x = Math.round((vbX / SVG_SIZE) * (w - 1));
  const y = Math.round((vbY / SVG_SIZE) * (h - 1));
  const startIdx = y * w + x;
  if (x < 0 || x >= w || y < 0 || y >= h || !mask[startIdx]) return null;

  const result = new Uint8Array(w * h);
  const stack = [startIdx];
  result[startIdx] = 1;
  while (stack.length > 0) {
    const curr = stack.pop()!;
    const cx = curr % w, cy = (curr / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      const ni = ny * w + nx;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[ni] && !result[ni]) {
        result[ni] = 1; stack.push(ni);
      }
    }
  }
  return result;
}

function tracePath(mask: Uint8Array, w: number, h: number) {
  const points: {x: number, y: number}[] = [];
  const step = 4;
  for(let y=0; y<h; y+=step) {
    for(let x=0; x<w; x+=step) {
      if(mask[y*w+x]) {
        const isEdge = x===0 || x>=w-step || y===0 || y>=h-step || !mask[y*w+(x+step)] || !mask[y*w+(x-step)] || !mask[(y+step)*w+x] || !mask[(y-step)*w+x];
        if(isEdge) points.push({ x: (x/w)*SVG_SIZE, y: (y/h)*SVG_SIZE });
      }
    }
  }
  if(points.length < 10) return "";
  const center = points.reduce((a,b) => ({x: a.x+b.x, y: a.y+b.y}), {x:0, y:0});
  center.x /= points.length; center.y /= points.length;
  points.sort((a,b) => Math.atan2(a.y-center.y, a.x-center.x) - Math.atan2(b.y-center.y, b.x-center.x));
  return `M ${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")} Z`;
}

async function applyRecolor(originalUrl: string, segments: Segment[], strength: number) {
  const img = await loadImage(originalUrl);
  const canvas = document.createElement("canvas");
  canvas.width = WORK_RES; canvas.height = WORK_RES;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, WORK_RES, WORK_RES);
  const imgData = ctx.getImageData(0, 0, WORK_RES, WORK_RES);
  const pixels = imgData.data;

  for (const seg of segments) {
    const tgtRgb = hexToRgb(seg.color);
    const tgtLab = rgbToLab(tgtRgb.r, tgtRgb.g, tgtRgb.b);
    for (let i = 0; i < seg.mask.length; i++) {
      if (seg.mask[i]) {
        const p = i * 4;
        const lab = rgbToLab(pixels[p], pixels[p+1], pixels[p+2]);
        // Ersetze a/b (Farbe), behalte L (Helligkeit/Schatten)
        const out = labToRgb(lab.L, lab.a + (tgtLab.a - lab.a) * strength, lab.b + (tgtLab.b - lab.b) * strength);
        pixels[p] = out.r; pixels[p+1] = out.g; pixels[p+2] = out.b;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

// ----------------------- COMPONENT -----------------------

const StatPage: React.FC = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [originalPng, setOriginalPng] = useState<string | null>(null);
  const [originalJpeg, setOriginalJpeg] = useState<string | null>(null);
  const [maskBuffer, setMaskBuffer] = useState<MaskBuffer | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState(BORER_PALETTE[0].hex);
  const [strength, setStrength] = useState(0.85);

  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("processing");
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const png = await prepareImage(dataUrl, SVG_SIZE, "image/png");
      const jpeg = await prepareImage(dataUrl, SVG_SIZE, "image/jpeg");
      setOriginalPng(png); setOriginalJpeg(jpeg);
      setSegments([]); setPreview(null); setMaskBuffer(null);
      setStatus("ready");
    };
    reader.readAsDataURL(file);
  };

  const runAIScan = async () => {
    if (!originalJpeg) return;
    setStatus("ai");
    try {
      const res = await processRoomRequest(originalJpeg.split(",")[1], "", "keymask");
      if (!res?.editedImage) throw new Error();
      const buffer = await createBinaryMask(res.editedImage);
      setMaskBuffer(buffer); setStatus("ready");
    } catch (e) {
      alert("KI Scan fehlgeschlagen. Bitte prüfen Sie die Internetverbindung.");
      setStatus("ready");
    }
  };

  const onSvgClick = async (e: React.MouseEvent) => {
    if (!svgRef.current || !maskBuffer || status !== "ready" || !originalPng) return;
    
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    
    const area = floodFill(maskBuffer, svgPt.x, svgPt.y);
    if (!area) return;

    const path = tracePath(area, maskBuffer.width, maskBuffer.height);
    if (!path) return;

    const newSeg: Segment = { id: Date.now().toString(), color: activeColor, mask: area, pathData: path };
    const updated = [...segments, newSeg];
    setSegments(updated);
    setStatus("processing");
    const out = await applyRecolor(originalPng, updated, strength);
    setPreview(out);
    setStatus("ready");
  };

  return (
    <section className="bg-zinc-950 min-h-screen pt-24 pb-20 text-white font-sans selection:bg-olive-500/30">
      <div className="container mx-auto px-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-olive-500 font-black uppercase tracking-[0.4em] text-[10px] italic">Borer Atelier v10.4</span>
              <span className="w-1.5 h-1.5 rounded-full bg-olive-500 animate-pulse"></span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase italic leading-none brand-font">Smart <span className="text-zinc-800">Designer</span></h1>
          </div>
          <div className="flex gap-4">
            <button onClick={() => fileInputRef.current?.click()} className="bg-white text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-olive-500 hover:text-white transition-all">Foto wählen</button>
            <button onClick={runAIScan} disabled={!originalPng || status !== "ready"} className="bg-zinc-900 border border-zinc-800 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-800 disabled:opacity-20 transition-all">KI Scan starten</button>
          </div>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Main Visualizer */}
          <div className="lg:col-span-8 relative">
            <div className="relative aspect-video bg-zinc-900 rounded-[3.5rem] overflow-hidden border-8 border-zinc-900 shadow-2xl group">
              {originalPng ? (
                <>
                  <svg ref={svgRef} viewBox="0 0 1000 1000" className={`absolute inset-0 w-full h-full z-10 ${maskBuffer ? 'cursor-crosshair' : 'cursor-default'}`} preserveAspectRatio="xMidYMid slice" onClick={onSvgClick}>
                    <image href={preview || originalPng} width="1000" height="1000" preserveAspectRatio="xMidYMid slice" />
                    {segments.map(s => (
                      <path key={s.id} d={s.pathData} fill="transparent" stroke="white" strokeWidth="2" strokeDasharray="6,6" opacity="0.4" />
                    ))}
                  </svg>
                  
                  {/* Status Overlays */}
                  {status === "ai" && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-50 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 border-4 border-olive-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-8 font-black uppercase tracking-widest text-olive-500 animate-pulse text-[10px]">KI analysiert Raumgeometrie...</p>
                    </div>
                  )}
                  {status === "processing" && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  {maskBuffer && status === "ready" && (
                    <div className="absolute top-8 left-8 z-20 bg-olive-600 text-white px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-2xl pointer-events-none animate-in fade-in slide-in-from-left-4">
                      Bereit: Wände oder Decke antippen
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                   <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-8 text-4xl group-hover:scale-110 group-hover:bg-olive-600 transition-all duration-500 shadow-inner">📸</div>
                   <h2 className="text-3xl font-black brand-font uppercase mb-4 italic text-zinc-600 tracking-tighter">Starten Sie Ihr Projekt</h2>
                   <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em]">Foto hochladen & KI-Planung nutzen</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-between items-center px-10 text-[9px] font-black uppercase tracking-widest text-zinc-600">
               <span className="flex items-center gap-2">
                 <span className={`w-2 h-2 rounded-full ${maskBuffer ? 'bg-green-500' : 'bg-zinc-800'}`}></span>
                 {maskBuffer ? 'Wandmaske Aktiv' : 'Wandmaske Ausstehend'}
               </span>
               <span>{segments.length} Selektierte Bereiche</span>
            </div>
          </div>

          {/* Controls Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-zinc-900 p-10 rounded-[3rem] border border-zinc-800 shadow-2xl">
              <h2 className="text-xl font-black brand-font uppercase mb-10 italic">Farbpalette</h2>
              <div className="grid grid-cols-4 gap-4 mb-12">
                {BORER_PALETTE.map(c => (
                  <button 
                    key={c.hex} 
                    onClick={() => setActiveColor(c.hex)}
                    className={`aspect-square rounded-2xl transition-all duration-300 ${activeColor === c.hex ? 'ring-4 ring-white scale-110 shadow-2xl' : 'opacity-30 hover:opacity-100 hover:scale-105'}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-black/40 rounded-3xl border border-zinc-800">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-olive-500 font-black uppercase text-[9px] tracking-widest">Recoloring Stärke</span>
                    <span className="text-zinc-600 text-[9px] font-black">{(strength * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0.3" max="1" step="0.05" 
                    value={strength} 
                    onChange={async (e) => {
                      const val = parseFloat(e.target.value);
                      setStrength(val);
                      if (originalPng && segments.length > 0) {
                        setStatus("processing");
                        const out = await applyRecolor(originalPng, segments, val);
                        setPreview(out);
                        setStatus("ready");
                      }
                    }} 
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-olive-500" 
                  />
                </div>
                
                <button 
                  onClick={() => { setSegments([]); setPreview(null); }}
                  className="w-full py-5 bg-zinc-800 hover:bg-red-900/20 hover:text-red-500 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all"
                >
                  Alles zurücksetzen
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-8 bg-olive-900/10 rounded-[2.5rem] border border-olive-900/20">
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-olive-600 rounded-xl flex items-center justify-center font-black">B</div>
                  <span className="text-xs font-black uppercase tracking-widest text-olive-500">Borer Qualität</span>
               </div>
               <p className="text-[10px] text-olive-200/50 font-bold leading-relaxed italic uppercase">
                 "Durch die Lab-Farbraum-Berechnung bleiben alle Schatten und Texturen Ihres Raumes erhalten. Das Ergebnis wirkt absolut natürlich."
               </p>
            </div>
          </div>
        </div>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onUpload} />
    </section>
  );
};

export default StatPage;