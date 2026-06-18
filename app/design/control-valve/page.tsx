"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { References } from "@/components/References";
import { REFS_CONTROL_VALVE } from "@/lib/references";

// ─── Constants ─────────────────────────────────────────────────────────────────
const KV_TO_CV = 1.1561; // Cv = Kv × 1.1561

// ─── Physics (IEC 60534-2-1 / ISA-75.01.01) ──────────────────────────────────

// Liquid service
interface LiqResult {
  service:"liquid"; Kv:number; Cv:number;
  dPeff:number; dPchoked:number; FF:number;
  choked:boolean; cavitating:boolean; flashing:boolean; sigma:number|null;
}
function calcLiquid(
  Q:number, P1:number, P2:number, SG:number, Pv:number, Pc:number, FL:number, Fp:number
):LiqResult|null {
  if(Q<=0||P1<=0||P1<=P2) return null;
  const dP      = P1-P2;
  const FF      = Math.min(0.96, 0.96-0.28*Math.sqrt(Math.max(0,Pv/Pc)));
  const dPchoked= FL*FL*(P1-FF*Pv);
  const dPeff   = Math.min(dP,dPchoked);
  const choked  = dP>=dPchoked;
  const flashing= P2<=Pv;
  const sigma   = Pv>0 ? dP/(P1-Pv) : null;
  const cavitating = sigma!==null && sigma>FL*FL && !flashing;
  if(dPeff<=0||SG<=0) return null;
  const Kv = (Q/Fp)*Math.sqrt(SG/dPeff);
  return {service:"liquid",Kv,Cv:Kv*KV_TO_CV,dPeff,dPchoked,FF,choked,cavitating,flashing,sigma};
}

// Gas / Vapour service
interface GasResult {
  service:"gas"|"steam"; Kv:number; Cv:number;
  x:number; xChoked:number; Y:number; choked:boolean;
}
function calcGas(
  Qn:number,P1:number,dP:number,T1K:number,rhoN:number,xT:number,gamma:number,Fp:number
):GasResult|null {
  if(Qn<=0||P1<=0||dP<=0||T1K<=0||rhoN<=0) return null;
  const x      = Math.min(dP/P1,0.999);
  const Fg     = gamma/1.4;
  const xChoked= Math.min(Fg*xT,0.999);
  const choked = x>=xChoked;
  const xEff   = Math.min(x,xChoked);
  const Y      = Math.max(0.667,1-xEff/(3*Fg*xT));
  const inner  = rhoN*T1K/(273.15*xEff*P1);
  if(inner<=0) return null;
  const Kv = (Qn/(P1*Y*Fp))*Math.sqrt(inner);
  return {service:"gas",Kv,Cv:Kv*KV_TO_CV,x,xChoked,Y,choked};
}
function calcSteam(
  W:number,P1:number,dP:number,v1:number,xT:number,gamma:number,Fp:number
):GasResult|null {
  if(W<=0||P1<=0||dP<=0||v1<=0) return null;
  const x      = Math.min(dP/P1,0.999);
  const Fg     = gamma/1.4;
  const xChoked= Math.min(Fg*xT,0.999);
  const choked = x>=xChoked;
  const xEff   = Math.min(x,xChoked);
  const Y      = Math.max(0.667,1-xEff/(3*Fg*xT));
  const Kv     = (W*Math.sqrt(v1))/(31.62*Fp*P1*Y*Math.sqrt(xEff));
  return {service:"steam",Kv,Cv:Kv*KV_TO_CV,x,xChoked,Y,choked};
}

// ─── Unit conversions ─────────────────────────────────────────────────────────
const TO_BARA:Record<string,(v:number)=>number> = {
  "bar_g": v=>v+1.01325, "MPa_g": v=>v*10+1.01325,
  "kPa_g": v=>v/100+1.01325, "psi_g": v=>v*0.06895+1.01325,
};
const TO_DPBAR:Record<string,number> = {bar:1,MPa:10,kPa:0.01,psi:0.06895};

// ─── Valve type data (FL = liquid pressure recovery, xT = gas choke ratio) ────
const VALVE_TYPES = [
  {id:"globe_s", label:"Globe — single seat",        FL:0.90,xT:0.72,note:"Best control accuracy, tight shutoff. High ΔP capability."},
  {id:"globe_d", label:"Globe — double seat",        FL:0.85,xT:0.70,note:"High capacity. Cannot achieve Class VI shutoff."},
  {id:"angle",   label:"Angle valve",                FL:0.80,xT:0.65,note:"Self-draining. Suited to flashing and dirty service."},
  {id:"ball_red",label:"Ball — reduced bore (V-port)",FL:0.70,xT:0.55,note:"Good rangeability. Very popular in process plants."},
  {id:"ball_full",label:"Ball — full bore",          FL:0.60,xT:0.42,note:"Low ΔP isolation applications."},
  {id:"bfly_hd", label:"Butterfly — high-duty",     FL:0.68,xT:0.45,note:"Large diameter / moderate ΔP service."},
  {id:"bfly_std",label:"Butterfly — standard",      FL:0.55,xT:0.35,note:"Low ΔP utility service, large pipelines."},
  {id:"plug_rot",label:"Plug — rotary eccentric",   FL:0.77,xT:0.60,note:"Good for slurries and viscous fluids."},
];

// ─── Standard Cv ratings (representative, per valve family, at full open) ─────
const VALVE_SIZES = [
  {inch:'½"',  dn:15,  cvGlobe:6.3,  cvBall:14,   cvBfly:8   },
  {inch:'¾"',  dn:20,  cvGlobe:10,   cvBall:25,   cvBfly:15  },
  {inch:'1"',  dn:25,  cvGlobe:20,   cvBall:45,   cvBfly:30  },
  {inch:'1½"', dn:40,  cvGlobe:45,   cvBall:100,  cvBfly:65  },
  {inch:'2"',  dn:50,  cvGlobe:75,   cvBall:175,  cvBfly:130 },
  {inch:'3"',  dn:80,  cvGlobe:175,  cvBall:415,  cvBfly:310 },
  {inch:'4"',  dn:100, cvGlobe:310,  cvBall:730,  cvBfly:550 },
  {inch:'6"',  dn:150, cvGlobe:700,  cvBall:1700, cvBfly:1250},
  {inch:'8"',  dn:200, cvGlobe:1200, cvBall:3000, cvBfly:2200},
  {inch:'10"', dn:250, cvGlobe:1900, cvBall:4800, cvBfly:3500},
  {inch:'12"', dn:300, cvGlobe:2800, cvBall:7000, cvBfly:5100},
  {inch:'16"', dn:400, cvGlobe:5500, cvBall:13000,cvBfly:9500},
];
function getCvRated(typeId:string, sz:typeof VALVE_SIZES[0]):number {
  if(typeId.startsWith("globe")||typeId==="angle") return sz.cvGlobe;
  if(typeId.startsWith("ball"))                    return sz.cvBall;
  return sz.cvBfly;
}

// ─── Fluid presets ─────────────────────────────────────────────────────────────
const LIQUID_PRESETS = [
  {id:"w20",  label:"Water 20 °C",      SG:0.998,Pv:0.0234,Pc:220.9},
  {id:"w80",  label:"Water 80 °C",      SG:0.972,Pv:0.474, Pc:220.9},
  {id:"w100", label:"Water 100 °C",     SG:0.958,Pv:1.013, Pc:220.9},
  {id:"diesel",label:"Diesel",          SG:0.840,Pv:0.003, Pc:25.0 },
  {id:"crude",label:"Light crude oil",  SG:0.870,Pv:0.002, Pc:22.0 },
  {id:"sw",   label:"Seawater 20 °C",  SG:1.025,Pv:0.023, Pc:220.9},
  {id:"gly",  label:"EG 50% antifreeze",SG:1.049,Pv:0.018,Pc:60.0 },
  {id:"custom",label:"Custom",          SG:NaN,  Pv:NaN,   Pc:NaN  },
];
const GAS_PRESETS = [
  {id:"air",   label:"Air (dry)",           MW:28.97,gamma:1.40,rhoN:1.293},
  {id:"natgas",label:"Natural gas (typical)",MW:16.5, gamma:1.31,rhoN:0.738},
  {id:"n2",    label:"Nitrogen",            MW:28.01,gamma:1.40,rhoN:1.250},
  {id:"co2",   label:"Carbon dioxide",      MW:44.01,gamma:1.30,rhoN:1.964},
  {id:"h2",    label:"Hydrogen",            MW:2.016,gamma:1.41,rhoN:0.090},
  {id:"propane",label:"Propane",            MW:44.10,gamma:1.13,rhoN:1.967},
  {id:"custom",label:"Custom",              MW:NaN,  gamma:NaN, rhoN:NaN  },
];

// Saturated steam [T°C, P_bara, v_m³/kg, γ]
const STEAM_SAT:[number,number,number,number][] = [
  [100,1.013,1.674,1.33],[120,1.985,0.892,1.32],[140,3.614,0.509,1.31],
  [160,6.178,0.307,1.30],[180,10.03,0.194,1.28],[200,15.54,0.127,1.27],
  [220,23.18,0.0868,1.26],[240,33.44,0.0597,1.24],[260,46.88,0.0423,1.22],
  [280,64.13,0.0302,1.20],[300,85.81,0.0216,1.18],[320,112.7,0.0152,1.15],
];
function steamProps(T:number):{P:number;v:number;gamma:number}|null {
  if(T<STEAM_SAT[0][0]||T>STEAM_SAT[STEAM_SAT.length-1][0]) return null;
  for(let i=0;i<STEAM_SAT.length-1;i++){
    const[t0,p0,v0,g0]=STEAM_SAT[i],[t1,p1,v1,g1]=STEAM_SAT[i+1];
    if(T>=t0&&T<=t1){const f=(T-t0)/(t1-t0);return{P:p0+f*(p1-p0),v:v0+f*(v1-v0),gamma:g0+f*(g1-g0)};}
  }
  return null;
}

// ─── Leakage classes (ANSI/FCI 70-2) ─────────────────────────────────────────
const LEAKAGE_CLASSES = [
  {id:"ii",  label:"Class II",  leakage:"0.5% of rated Cv",   note:"Double-ported, balanced plug designs"},
  {id:"iii", label:"Class III", leakage:"0.1% of rated Cv",   note:"Improved double-ported designs"},
  {id:"iv",  label:"Class IV",  leakage:"0.01% of rated Cv",  note:"Metal-seated, standard. Most common general service."},
  {id:"v",   label:"Class V",   leakage:"0.0005 mL/min per psi ΔP per inch bore",note:"Metal-to-metal seat. High-performance services."},
  {id:"vi",  label:"Class VI",  leakage:"Bubble-tight (soft seat)",note:"Toxic, flammable, or absolute isolation service."},
];

// ─── Actuator types ───────────────────────────────────────────────────────────
const ACTUATOR_TYPES = [
  {id:"spd",  label:"Spring-diaphragm (pneumatic)", addFactor:1.00,note:"Standard. Fail-safe to open or close. Requires instrument air supply."},
  {id:"spp",  label:"Spring-piston (pneumatic)",    addFactor:1.30,note:"Higher thrust for large valves or high ΔP. Requires clean dry air."},
  {id:"elec", label:"Electric actuator",            addFactor:1.80,note:"No air supply needed. Slower stroke. Backup battery for fail-safe."},
  {id:"hyd",  label:"Hydraulic actuator",           addFactor:2.50,note:"Very high force — large valves or subsea. Complex, expensive."},
  {id:"manual",label:"Manual (handwheel only)",     addFactor:0.35,note:"Non-throttling isolation, bypass, or commissioning valves."},
];

// ─── Body material recommendation ────────────────────────────────────────────
type ServiceMode = "liquid"|"gas"|"steam";
function bodyMaterial(mode:ServiceMode, T_C:number, fluidId:string):{mat:string;astm:string;note:string} {
  if(mode==="steam") {
    if(T_C>350) return {mat:"Alloy steel",     astm:"ASTM A217 WC6", note:"Cr-Mo for high-temperature steam >350 °C"};
    return          {mat:"Carbon steel",       astm:"ASTM A216 WCB", note:"Standard steam service"};
  }
  if(mode==="gas") {
    if(T_C<-29) return {mat:"Low-temp CS",    astm:"ASTM A352 LCB", note:"Low-temperature gas service"};
    if(T_C>400) return {mat:"Alloy steel",    astm:"ASTM A217 WC6", note:"Elevated temperature gas"};
    return          {mat:"Carbon steel",       astm:"ASTM A216 WCB", note:"Standard gas service"};
  }
  // Liquid
  if(fluidId==="sw")   return {mat:"316 SS",     astm:"ASTM A351 CF8M",note:"Seawater — stainless to resist chloride attack"};
  if(T_C<-29)          return {mat:"Low-temp CS", astm:"ASTM A352 LCB", note:"Low-temperature liquid service"};
  if(T_C>400)          return {mat:"Alloy steel", astm:"ASTM A217 WC6", note:"High-temperature liquid"};
  if(T_C>200||fluidId==="crude") return {mat:"Carbon steel",astm:"ASTM A216 WCB",note:"Elevated temperature or hydrocarbon liquid"};
  return                         {mat:"Carbon steel",astm:"ASTM A216 WCB",note:"Standard process liquid"};
}

// ─── Pressure class & cost ────────────────────────────────────────────────────
function pressureClass(P1barg:number):string {
  if(P1barg<=19.6)  return "ANSI Class 150#";
  if(P1barg<=51.1)  return "ANSI Class 300#";
  if(P1barg<=102.1) return "ANSI Class 600#";
  if(P1barg<=153.2) return "ANSI Class 900#";
  if(P1barg<=255.3) return "ANSI Class 1500#";
  return "ANSI Class 2500#";
}

// ZAR base price (globe body, CS, 150#, spring-diaphragm actuator, standard trim)
const CV_BASE_ZAR:Partial<Record<number,number>> = {
  15:5500, 20:7200, 25:9500, 40:14000, 50:20000,
  80:38000, 100:58000, 150:105000, 200:180000, 250:270000, 300:380000, 400:620000,
};
const CLASS_FACTOR:Record<string,number> = {
  "ANSI Class 150#":1.00,"ANSI Class 300#":1.35,"ANSI Class 600#":1.90,
  "ANSI Class 900#":2.80,"ANSI Class 1500#":4.50,"ANSI Class 2500#":6.00,
};
const MAT_FACTOR:Record<string,number> = {
  "Carbon steel":1.0,"Low-temp CS":1.12,"Alloy steel":1.75,"316 SS":2.50,
};
const TRIM_FACTOR:Record<string,number> = {
  standard:1.0, anticavitation:1.55, noise:1.40, flash:1.70, hightemp:1.20,
};
const TYPE_FACTOR:Record<string,number> = {
  globe:1.00, angle:1.10, ball:0.85, bfly:0.65, plug:0.90,
};

function valveCostZAR(
  dn:number, classLabel:string, mat:string, trimKey:string,
  typeId:string, actuatorFactor:number, qty:number
):number|null {
  function interp(dn:number):number|null {
    const keys=Object.keys(CV_BASE_ZAR).map(Number).sort((a,b)=>a-b);
    if(CV_BASE_ZAR[dn]) return CV_BASE_ZAR[dn]!;
    if(dn<keys[0]) return CV_BASE_ZAR[keys[0]]!;
    if(dn>keys[keys.length-1]) return CV_BASE_ZAR[keys[keys.length-1]]!;
    for(let i=0;i<keys.length-1;i++){
      if(dn>=keys[i]&&dn<=keys[i+1]){
        const t=(dn-keys[i])/(keys[i+1]-keys[i]);
        return CV_BASE_ZAR[keys[i]]!+t*(CV_BASE_ZAR[keys[i+1]]!-CV_BASE_ZAR[keys[i]]!);
      }
    }
    return null;
  }
  const base=interp(dn);
  if(base===null) return null;
  const typeK = typeId.startsWith("globe")||typeId==="angle" ? "globe" :
                typeId.startsWith("ball")   ? "ball" :
                typeId.startsWith("bfly")   ? "bfly" : "plug";
  const tf = TYPE_FACTOR[typeK]??1.0;
  const cf = CLASS_FACTOR[classLabel]??1.0;
  const mf = MAT_FACTOR[mat]??1.0;
  const trf= TRIM_FACTOR[trimKey]??1.0;
  return base * cf * mf * trf * tf * actuatorFactor * qty;
}

function trimKey(res:LiqResult|GasResult|null):string {
  if(!res) return "standard";
  if(res.service==="liquid"){
    if(res.flashing)   return "flash";
    if(res.cavitating) return "anticavitation";
    return "standard";
  }
  if(res.choked && res.service!=="steam") return "noise";
  return "standard";
}

// ─── Noise flag ───────────────────────────────────────────────────────────────
function noiseRisk(res:GasResult|null):boolean {
  if(!res||res.service==="steam") return false;
  return res.choked || res.x>0.5;
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────
const SEL="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
const INP="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500";

function fmt(n:number,dp=2):string{return isFinite(n)?n.toFixed(dp):"—";}
function sig(n:number,s=4):string{return isFinite(n)?parseFloat(n.toPrecision(s)).toString():"—";}

// Render label with proper HTML subscripts — converts "P_1" → P<sub>1</sub>
function Lbl({children}:{children:string}):React.ReactElement {
  const parts=children.split(/(_[^_\s()]+)/g);
  return (
    <>{parts.map((p,i)=>
      p.startsWith("_")
        ? <sub key={i} className="text-[0.72em]">{p.slice(1)}</sub>
        : <React.Fragment key={i}>{p}</React.Fragment>
    )}</>
  );
}

function Card({children,className=""}:{children:React.ReactNode;className?:string}){
  return <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 ${className}`}>{children}</div>;
}
function SideLabel({n,children}:{n:number|string;children:React.ReactNode}){
  return(
    <div className="flex items-center gap-2 mb-3">
      <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{n}</span>
      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{children}</span>
    </div>
  );
}
function SecHead({title,sub,accent="emerald"}:{title:string;sub?:string;accent?:string}){
  const bars:Record<string,string>={emerald:"bg-emerald-500",red:"bg-red-500",amber:"bg-amber-500",blue:"bg-blue-500",gray:"bg-gray-400 dark:bg-gray-500",indigo:"bg-indigo-500"};
  return(
    <div className="flex items-start gap-3 mb-4">
      <div className={`w-1 self-stretch min-h-[2rem] rounded-full flex-shrink-0 ${bars[accent]??bars.emerald}`}/>
      <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        {sub&&<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ControlValvePage(){
  // ── Service mode ───────────────────────────────────────────────────────────
  const [mode,        setMode]        = useState<ServiceMode>("liquid");

  // ── Liquid ─────────────────────────────────────────────────────────────────
  const [liqPreset,   setLiqPreset]   = useState(0);
  const [cSG,         setCSG]         = useState("1.0");
  const [cPv,         setCPv]         = useState("0.023");
  const [cPc,         setCPc]         = useState("220.9");
  const [flowLiq,     setFlowLiq]     = useState("");
  const [flowLiqUnit, setFlowLiqUnit] = useState("m³/h");

  // ── Gas ────────────────────────────────────────────────────────────────────
  const [gasPreset,   setGasPreset]   = useState(0);
  const [cMW,         setCMW]         = useState("28.97");
  const [cGamma,      setCGamma]      = useState("1.40");
  const [cRhoN,       setCRhoN]       = useState("1.293");
  const [flowGas,     setFlowGas]     = useState("");

  // ── Steam ──────────────────────────────────────────────────────────────────
  const [steamT,      setSteamT]      = useState("160");
  const [flowSteam,   setFlowSteam]   = useState("");

  // ── Service conditions ─────────────────────────────────────────────────────
  const [P1val,       setP1val]       = useState("");
  const [P1unit,      setP1unit]      = useState("bar_g");
  const [dPval,       setDPval]       = useState("");
  const [dPunit,      setDPunit]      = useState("bar");
  const [T1val,       setT1val]       = useState("20");

  // ── Valve ──────────────────────────────────────────────────────────────────
  const [vTypeIdx,    setVTypeIdx]    = useState(0);
  const [cvMargin,    setCvMargin]    = useState("1.25");
  const [pipeBore,    setPipeBore]    = useState("");     // mm ID, optional
  const [tagNo,       setTagNo]       = useState("");

  // ── Specification details ──────────────────────────────────────────────────
  const [leakageIdx,  setLeakageIdx]  = useState(2);     // Class IV default
  const [actIdx,      setActIdx]      = useState(0);     // spring-diaphragm
  const [valveQty,    setValveQty]    = useState("1");
  const [copied,      setCopied]      = useState(false);

  // ── Shortcuts ──────────────────────────────────────────────────────────────
  const vType   = VALVE_TYPES[vTypeIdx];
  const liqP    = LIQUID_PRESETS[liqPreset];
  const gasP    = GAS_PRESETS[gasPreset];
  const actType = ACTUATOR_TYPES[actIdx];
  const leakage = LEAKAGE_CLASSES[leakageIdx];

  const SG    = liqP.id==="custom" ? parseFloat(cSG)    : liqP.SG;
  const Pv    = liqP.id==="custom" ? parseFloat(cPv)    : liqP.Pv;
  const Pc    = liqP.id==="custom" ? parseFloat(cPc)    : liqP.Pc;
  const MW    = gasP.id==="custom" ? parseFloat(cMW)    : gasP.MW;
  const gamma = gasP.id==="custom" ? parseFloat(cGamma) : gasP.gamma;
  const rhoN  = gasP.id==="custom" ? parseFloat(cRhoN)  : gasP.rhoN;

  // ── Main computation ───────────────────────────────────────────────────────
  const result = useMemo(()=>{
    const P1  = (TO_BARA[P1unit]?.(parseFloat(P1val)))??NaN;
    const dP  = parseFloat(dPval)*(TO_DPBAR[dPunit]??1);
    const P2  = P1-dP;
    const T1C = parseFloat(T1val);
    const T1K = T1C+273.15;
    if(!isFinite(P1)||P1<=0||!isFinite(dP)||dP<=0) return null;

    if(mode==="liquid"){
      let Q=parseFloat(flowLiq);
      if(flowLiqUnit==="GPM") Q*=0.2271;
      if(flowLiqUnit==="L/s") Q*=3.6;
      if(!isFinite(Q)||Q<=0||!isFinite(SG)) return null;
      return calcLiquid(Q,P1,P2,SG,Pv,Pc,vType.FL,1.0);
    }
    if(mode==="gas"){
      const Q=parseFloat(flowGas);
      if(!isFinite(Q)||Q<=0||!isFinite(rhoN)) return null;
      return calcGas(Q,P1,dP,T1K,rhoN*273.15/T1K,vType.xT,gamma,1.0);
    }
    if(mode==="steam"){
      const W=parseFloat(flowSteam);
      if(!isFinite(W)||W<=0) return null;
      const p=steamProps(T1C);
      if(!p) return {error:"Saturated steam tables cover 100–320 °C."};
      return calcSteam(W,p.P,dP,p.v,vType.xT,p.gamma,1.0);
    }
    return null;
  },[mode,flowLiq,flowLiqUnit,flowGas,flowSteam,P1val,P1unit,dPval,dPunit,T1val,
     SG,Pv,Pc,rhoN,gamma,vType]);

  const hasError = result!==null&&"error"in result;
  type Good = LiqResult|GasResult;
  const res:Good|null = result&&!hasError ? result as Good : null;

  // ── Derived ────────────────────────────────────────────────────────────────
  const P1_barg = parseFloat(P1val)*(P1unit==="MPa_g"?10:P1unit==="kPa_g"?0.01:P1unit==="psi_g"?0.06895:1);
  const pClass  = pressureClass(P1_barg);
  const T1C     = parseFloat(T1val);
  const fluidId = liqP.id;
  const bodyMat = bodyMaterial(mode, T1C, fluidId);
  const tk      = trimKey(res as LiqResult|GasResult|null);
  const noise   = noiseRisk(res as GasResult|null);

  // Pipe velocity check
  const pipeVel = useMemo(()=>{
    const bore=parseFloat(pipeBore)/1000;  // mm → m
    if(!res||!isFinite(bore)||bore<=0) return null;
    const A=Math.PI/4*bore*bore;
    if(mode==="liquid"){
      let Q=parseFloat(flowLiq);
      if(flowLiqUnit==="GPM") Q*=0.2271;
      if(flowLiqUnit==="L/s") Q*=3.6;
      return isFinite(Q)&&Q>0 ? (Q/3600)/A : null; // m/s
    }
    return null; // gas velocity complex - skip for now
  },[res,pipeBore,mode,flowLiq,flowLiqUnit]);

  // Size table
  const sizeTable = useMemo(()=>{
    if(!res) return [];
    const margin=parseFloat(cvMargin)||1.25;
    return VALVE_SIZES.map(sz=>{
      const CvRated=getCvRated(vType.id,sz);
      const pass=CvRated>=res.Cv*margin;
      const openPct=(res.Cv/CvRated)*100;
      return {...sz,CvRated,pass,openPct};
    });
  },[res,cvMargin,vType]);

  const recommended = sizeTable.find(r=>r.pass)??null;

  // Cost
  const costZAR = useMemo(()=>{
    if(!recommended) return null;
    return valveCostZAR(
      recommended.dn, pClass, bodyMat.mat, tk,
      vType.id, actType.addFactor, parseInt(valveQty)||1
    );
  },[recommended,pClass,bodyMat.mat,tk,vType.id,actType.addFactor,valveQty]);

  function openingClass(pct:number):{label:string;color:string;bg:string}{
    if(pct<15) return{label:"Too low — poor rangeability",color:"text-red-600 dark:text-red-400",bg:"bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"};
    if(pct<25) return{label:"Marginal — consider smaller valve",color:"text-amber-600 dark:text-amber-400",bg:"bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"};
    if(pct>85) return{label:"Too high — consider larger valve",color:"text-amber-600 dark:text-amber-400",bg:"bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"};
    return{label:"Good control range",color:"text-green-600 dark:text-green-400",bg:"bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"};
  }

  function copySpec(){
    if(!res||!recommended) return;
    const tag=tagNo?`${tagNo} — `:"";
    const fluid=mode==="liquid"?liqP.label:mode==="gas"?gasP.label:`Saturated steam ${steamT}°C`;
    const text=`${tag}${recommended.inch} ${vType.label} · ${pClass} · ${bodyMat.astm} · Cv rated ${fmt(recommended.CvRated,0)} · Cv required ${fmt(res.Cv,1)} · ${leakage.label} · ${actType.label} · ${fluid}`;
    navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return(
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="mb-1">
            <Link href="/design" className="text-xs text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">← Design</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Control Valve Sizing</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            IEC 60534 / ISA-75 — Liquid · Gas · Steam · Cavitation · Choking · Body selection · Cost estimate
          </p>
        </div>
        <div className="flex rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0">
          {(["liquid","gas","steam"] as ServiceMode[]).map(m=>(
            <button key={m} onClick={()=>setMode(m)}
              className={`px-4 py-2 text-sm font-bold capitalize transition-colors ${mode===m?"bg-emerald-600 text-white":"bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
        <aside className="w-80 flex-shrink-0 space-y-4 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">

          {/* 1. Fluid */}
          <Card>
            <SideLabel n={1}>Fluid Properties</SideLabel>
            {mode==="liquid"&&(
              <div className="space-y-3">
                <select value={liqPreset} onChange={e=>setLiqPreset(Number(e.target.value))} className={SEL}>
                  {LIQUID_PRESETS.map((p,i)=><option key={i} value={i}>{p.label}</option>)}
                </select>
                {liqP.id==="custom"&&(
                  <>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Specific gravity SG</p><input type="number" value={cSG} onChange={e=>setCSG(e.target.value)} className={INP} step="any"/></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vapour pressure P<sub>v</sub> (bar_a)</p><input type="number" value={cPv} onChange={e=>setCPv(e.target.value)} className={INP} step="any"/></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Critical pressure P<sub>c</sub> (bar_a)</p><input type="number" value={cPc} onChange={e=>setCPc(e.target.value)} className={INP} step="any"/></div>
                  </>
                )}
                {liqP.id!=="custom"&&(
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                    <span>SG = {liqP.SG}</span>
                    <span>P<sub>v</sub> = {liqP.Pv} bar_a</span>
                    <span>P<sub>c</sub> = {liqP.Pc} bar_a</span>
                  </div>
                )}
              </div>
            )}
            {mode==="gas"&&(
              <div className="space-y-3">
                <select value={gasPreset} onChange={e=>setGasPreset(Number(e.target.value))} className={SEL}>
                  {GAS_PRESETS.map((p,i)=><option key={i} value={i}>{p.label}</option>)}
                </select>
                {gasP.id==="custom"&&(
                  <>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Molecular weight MW (kg/kmol)</p><input type="number" value={cMW} onChange={e=>setCMW(e.target.value)} className={INP} step="any"/></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Specific heat ratio γ (C<sub>p</sub>/C<sub>v</sub>)</p><input type="number" value={cGamma} onChange={e=>setCGamma(e.target.value)} className={INP} step="any"/></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Density ρ<sub>n</sub> at 0 °C, 1.013 bar (kg/Nm³)</p><input type="number" value={cRhoN} onChange={e=>setCRhoN(e.target.value)} className={INP} step="any"/></div>
                  </>
                )}
                {gasP.id!=="custom"&&(
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                    <span>MW = {gasP.MW}</span>
                    <span>γ = {gasP.gamma}</span>
                    <span>ρ<sub>n</sub> = {gasP.rhoN} kg/Nm³</span>
                  </div>
                )}
              </div>
            )}
            {mode==="steam"&&(
              <div className="space-y-2">
                <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saturation temperature (°C, 100–320)</p>
                  <input type="number" value={steamT} onChange={e=>setSteamT(e.target.value)} placeholder="160" className={INP}/>
                  {(()=>{const p=steamProps(parseFloat(steamT));return p?(
                    <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2 mt-1.5">
                      <span>P<sub>sat</sub> = {fmt(p.P,2)} bar_a</span>
                      <span>v = {sig(p.v,3)} m³/kg</span>
                    </div>
                  ):<p className="text-[10px] text-amber-500 mt-1">Valid range: 100–320 °C</p>;})()}
                </div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mass flow W (kg/h)</p><input type="number" value={flowSteam} onChange={e=>setFlowSteam(e.target.value)} placeholder="e.g. 5000" className={INP}/></div>
              </div>
            )}
          </Card>

          {/* 2. Flow rate */}
          {mode!=="steam"&&(
            <Card>
              <SideLabel n={2}>Flow Rate</SideLabel>
              {mode==="liquid"&&(
                <div className="flex gap-2">
                  <input type="number" value={flowLiq} onChange={e=>setFlowLiq(e.target.value)} placeholder="e.g. 150" className={`flex-1 ${INP}`}/>
                  <select value={flowLiqUnit} onChange={e=>setFlowLiqUnit(e.target.value)} className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {["m³/h","L/s","GPM"].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              )}
              {mode==="gas"&&(
                <div>
                  <input type="number" value={flowGas} onChange={e=>setFlowGas(e.target.value)} placeholder="Nm³/h at 0 °C, 1.01325 bar" className={INP}/>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Normal m³/h — reference 0 °C, 1.01325 bar</p>
                </div>
              )}
            </Card>
          )}

          {/* 3. Service conditions */}
          <Card>
            <SideLabel n={mode==="steam"?2:3}>Service Conditions</SideLabel>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Inlet pressure P<sub>1</sub> (gauge)</p>
                <div className="flex gap-2">
                  <input type="number" value={P1val} onChange={e=>setP1val(e.target.value)} placeholder="e.g. 10" className={`flex-1 ${INP}`}/>
                  <select value={P1unit} onChange={e=>setP1unit(e.target.value)} className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none">
                    {Object.keys(TO_BARA).map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pressure drop ΔP (across valve)</p>
                <div className="flex gap-2">
                  <input type="number" value={dPval} onChange={e=>setDPval(e.target.value)} placeholder="e.g. 2" className={`flex-1 ${INP}`}/>
                  <select value={dPunit} onChange={e=>setDPunit(e.target.value)} className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none">
                    {Object.keys(TO_DPBAR).map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              {mode!=="steam"&&(
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fluid temperature (°C)</p>
                  <input type="number" value={T1val} onChange={e=>setT1val(e.target.value)} placeholder="20" className={INP}/>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pipe bore — optional velocity check (mm ID)</p>
                <input type="number" value={pipeBore} onChange={e=>setPipeBore(e.target.value)} placeholder="e.g. 102" className={INP}/>
              </div>
            </div>
          </Card>

          {/* 4. Valve configuration */}
          <Card>
            <SideLabel n={mode==="steam"?3:4}>Valve Configuration</SideLabel>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Valve type</p>
                <select value={vTypeIdx} onChange={e=>setVTypeIdx(Number(e.target.value))} className={SEL}>
                  {VALVE_TYPES.map((v,i)=><option key={i} value={i}>{v.label}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{vType.note}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  F<sub>L</sub> = {vType.FL} · x<sub>T</sub> = {vType.xT}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cv safety margin for selection</p>
                <input type="number" value={cvMargin} onChange={e=>setCvMargin(e.target.value)} placeholder="1.25" step="0.05" className={INP}/>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Cv<sub>rated</sub> ≥ Cv<sub>calc</sub> × margin. Typical 1.1–1.3.</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tag number (optional)</p>
                <input type="text" value={tagNo} onChange={e=>setTagNo(e.target.value)} placeholder="e.g. FV-1001" className={SEL}/>
              </div>
            </div>
          </Card>

          {/* 5. Specification details */}
          <Card>
            <SideLabel n={mode==="steam"?4:5}>Specification Details</SideLabel>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shutoff leakage class (ANSI/FCI 70-2)</p>
                <select value={leakageIdx} onChange={e=>setLeakageIdx(Number(e.target.value))} className={SEL}>
                  {LEAKAGE_CLASSES.map((l,i)=><option key={i} value={i}>{l.label} — {l.leakage}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{leakage.note}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actuator type</p>
                <select value={actIdx} onChange={e=>setActIdx(Number(e.target.value))} className={SEL}>
                  {ACTUATOR_TYPES.map((a,i)=><option key={i} value={i}>{a.label}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{actType.note}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</p>
                <input type="number" value={valveQty} onChange={e=>setValveQty(e.target.value)} min="1" placeholder="1" className={INP}/>
              </div>
            </div>
          </Card>

        </aside>

        {/* ══ RESULTS ══════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Empty state */}
          {!result&&(
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-500 dark:text-gray-400">Enter flow, pressure, and fluid properties</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Results update live · Liquid · Gas · Steam</p>
            </div>
          )}

          {/* Error */}
          {hasError&&(
            <div className="flex items-start gap-3 px-5 py-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
              <span className="text-red-500 text-xl flex-shrink-0">⚠</span>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{(result as {error:string}).error}</p>
            </div>
          )}

          {res&&(
            <>
              {/* ── Kv / Cv + service status ─────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Kv required</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{fmt(res.Kv,1)}</p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">m³/h at 1 bar ΔP</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Cv required</p>
                  <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{fmt(res.Cv,1)}</p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">GPM / √psi</p>
                </div>

                {res.service==="liquid"&&(
                  <>
                    <div className={`rounded-xl border p-4 ${res.flashing?"bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800":res.choked?"bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800":"bg-gray-50 dark:bg-gray-700/60 border-gray-200 dark:border-gray-600"}`}>
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Flow regime</p>
                      <p className={`text-base font-bold ${res.flashing?"text-red-700 dark:text-red-300":res.choked?"text-amber-700 dark:text-amber-300":"text-green-700 dark:text-green-300"}`}>
                        {res.flashing?"Flashing":res.choked?"Choked":"Normal"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">ΔP<sub>eff</sub> = {fmt(res.dPeff,2)} bar</p>
                    </div>
                    <div className={`rounded-xl border p-4 ${res.cavitating?"bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800":"bg-gray-50 dark:bg-gray-700/60 border-gray-200 dark:border-gray-600"}`}>
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Cavitation</p>
                      <p className={`text-base font-bold ${res.cavitating?"text-orange-700 dark:text-orange-300":"text-green-700 dark:text-green-300"}`}>
                        {res.cavitating?"Yes":"None"}
                      </p>
                      {res.sigma!==null&&<p className="text-xs text-gray-400 mt-0.5">σ = {fmt(res.sigma,3)} · F<sub>L</sub>² = {fmt(vType.FL*vType.FL,3)}</p>}
                    </div>
                  </>
                )}

                {(res.service==="gas"||res.service==="steam")&&(
                  <>
                    <div className={`rounded-xl border p-4 ${res.choked?"bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800":"bg-gray-50 dark:bg-gray-700/60 border-gray-200 dark:border-gray-600"}`}>
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Flow regime</p>
                      <p className={`text-base font-bold ${res.choked?"text-amber-700 dark:text-amber-300":"text-green-700 dark:text-green-300"}`}>
                        {res.choked?"Choked":"Subcritical"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">x = {fmt(res.x,3)} · x<sub>T</sub> = {fmt(res.xChoked,3)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Y expansion</p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(res.Y,3)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{res.Y<=0.668?"Choke limit":"Subcritical"}</p>
                    </div>
                  </>
                )}
              </div>

              {/* ── Alerts ───────────────────────────────────────────────── */}
              {res.service==="liquid"&&(res.flashing||res.cavitating||res.choked)&&(
                <div className="space-y-2">
                  {res.flashing&&<div className="flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300"><span className="text-lg">⚠</span><span><strong>Flashing service</strong> — P<sub>2</sub> below vapour pressure. Two-phase flow at valve outlet. Specify hardened/alloy-lined trim; consider angle body; consult manufacturer for material selection.</span></div>}
                  {res.cavitating&&!res.flashing&&<div className="flex items-start gap-2 px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl text-sm text-orange-700 dark:text-orange-300"><span className="text-lg">⚠</span><span><strong>Cavitation</strong> — σ = {fmt(res.sigma??0,3)} exceeds F<sub>L</sub>² = {fmt(vType.FL*vType.FL,3)}. {(res.sigma??0)>1.5?" Severe — anti-cavitation multi-stage cage required.":" Mild — anti-cavitation trim recommended."}</span></div>}
                  {res.choked&&!res.flashing&&<div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300"><span className="text-lg">ℹ</span><span><strong>Choked flow</strong> — ΔP exceeds ΔP<sub>choked</sub> = {fmt(res.dPchoked,2)} bar. Cv calculated at effective ΔP<sub>eff</sub> = {fmt(res.dPeff,2)} bar.</span></div>}
                </div>
              )}
              {(res.service==="gas"||res.service==="steam")&&res.choked&&(
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                  <span className="text-lg">ℹ</span>
                  <span><strong>Choked (critical) flow</strong> — x = {fmt(res.x,3)} ≥ x<sub>T</sub> = {fmt(res.xChoked,3)}. Y locked at 0.667. Reducing P<sub>2</sub> further will not increase flow. Consider larger valve or higher inlet pressure.</span>
                </div>
              )}
              {noise&&(
                <div className="flex items-start gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-sm text-purple-700 dark:text-purple-300">
                  <span className="text-lg">🔊</span>
                  <span><strong>High noise risk</strong> — High ΔP gas service. Specify noise-attenuating whisper trim or install a downstream silencer/diffuser.</span>
                </div>
              )}
              {pipeVel!==null&&(
                <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm ${pipeVel>3?"bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300":"bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"}`}>
                  <span className="text-lg">{pipeVel>3?"⚠":"✓"}</span>
                  <span>Pipe velocity = <strong>{fmt(pipeVel,2)} m/s</strong> at {pipeBore} mm bore. {pipeVel>3?"Consider larger pipe — erosion risk above 3 m/s for liquid.":"Within recommended 0.5–3 m/s."}</span>
                </div>
              )}

              {/* ── Valve size selection table ───────────────────────────── */}
              <Card>
                <SecHead title="Valve Size Selection"
                  sub={`${vType.label} · Cv required = ${fmt(res.Cv,1)} · Margin ×${cvMargin}`}/>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b-2 border-gray-200 dark:border-gray-700">
                        <th className="text-left pb-2 pr-2">Size</th>
                        <th className="text-center pb-2 pr-2">DN</th>
                        <th className="text-right pb-2 pr-2">Cv<sub>rated</sub></th>
                        <th className="text-right pb-2 pr-2">Kv<sub>rated</sub></th>
                        <th className="text-right pb-2 pr-2">Opening (linear)</th>
                        <th className="text-right pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizeTable.map(row=>{
                        const isRec=recommended?.inch===row.inch;
                        return(
                          <tr key={row.inch} className={`border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${isRec?"bg-emerald-50 dark:bg-emerald-900/20":"hover:bg-gray-50 dark:hover:bg-gray-700/30"}`}>
                            <td className={`py-2.5 pr-2 font-bold ${isRec?"text-emerald-700 dark:text-emerald-300":"text-gray-800 dark:text-gray-200"}`}>
                              {row.inch}{isRec&&<span className="ml-2 text-[9px] px-1.5 py-0.5 bg-emerald-500 text-white rounded-full font-bold">✓</span>}
                            </td>
                            <td className="py-2.5 pr-2 text-center text-gray-500 dark:text-gray-400">{row.dn}</td>
                            <td className="py-2.5 pr-2 text-right font-mono text-gray-700 dark:text-gray-300">{fmt(row.CvRated,0)}</td>
                            <td className="py-2.5 pr-2 text-right font-mono text-gray-500 dark:text-gray-400">{fmt(row.CvRated/KV_TO_CV,0)}</td>
                            <td className={`py-2.5 pr-2 text-right font-mono font-semibold ${row.openPct<20||row.openPct>85?"text-amber-600 dark:text-amber-400":"text-gray-700 dark:text-gray-300"}`}>
                              {fmt(row.openPct,0)} %
                            </td>
                            <td className="py-2.5 text-right">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${row.pass?"bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300":"bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"}`}>
                                {row.pass?"OK":"FAIL"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
                  Cv<sub>rated</sub> based on representative {vType.label.split("—")[0].trim()} ratings — actual values vary by manufacturer.
                  Opening % assumes linear inherent characteristic; equal-percentage trims open wider for same Cv.
                </p>
                {!recommended&&<div className="mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 font-medium">⚠ Required Cv exceeds the largest listed size. Consider parallel valves or a butterfly body type.</div>}
              </Card>

              {/* ── Opening quality ──────────────────────────────────────── */}
              {recommended&&(()=>{
                const oc=openingClass(recommended.openPct);
                return(
                  <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border ${oc.bg}`}>
                    <span className="text-base">{recommended.openPct>=25&&recommended.openPct<=85?"✓":"⚠"}</span>
                    <div>
                      <p className={`text-sm font-bold ${oc.color}`}>{recommended.inch} opening: {fmt(recommended.openPct,0)} % — {oc.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Recommended control range: 20–80% open for good rangeability and stable control.</p>
                    </div>
                  </div>
                );
              })()}

              {/* ── Valve specification output card ─────────────────────── */}
              {recommended&&(
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800 rounded-2xl p-6 text-white">
                  <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                    <div>
                      {tagNo&&<p className="text-emerald-100 text-xs font-mono mb-1">{tagNo}</p>}
                      <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Valve Specification</p>
                      <p className="text-2xl font-black">{recommended.inch} {vType.label}</p>
                      <p className="text-emerald-100 text-sm mt-0.5">{pClass} · {bodyMat.astm}</p>
                    </div>
                    <button onClick={copySpec}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors">
                      {copied
                        ?<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied!</>
                        :<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy spec</>
                      }
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {[
                      {label:"Cv rated",   value:fmt(recommended.CvRated,0)},
                      {label:"Cv required",value:fmt(res.Cv,1)},
                      {label:"Opening",    value:`${fmt(recommended.openPct,0)} %`},
                      {label:"Kv required",value:fmt(res.Kv,1)},
                    ].map(item=>(
                      <div key={item.label} className="bg-white/15 rounded-xl px-3 py-2.5">
                        <p className="text-emerald-100 text-[10px] mb-0.5">{item.label}</p>
                        <p className="text-white font-bold text-sm">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="bg-white/10 rounded-xl px-4 py-3">
                      <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-1">Body material</p>
                      <p className="text-white text-sm font-semibold">{bodyMat.mat}</p>
                      <p className="text-emerald-200 text-[10px] mt-0.5">{bodyMat.astm} · {bodyMat.note}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl px-4 py-3">
                      <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-1">Trim type</p>
                      <p className="text-white text-sm font-semibold capitalize">{tk.replace("anticavitation","Anti-cavitation")}</p>
                      <p className="text-emerald-200 text-[10px] mt-0.5">{leakage.label} · {leakage.leakage}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl px-4 py-3">
                      <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-1">Actuator</p>
                      <p className="text-white text-sm font-semibold">{actType.label.split("(")[0].trim()}</p>
                      <p className="text-emerald-200 text-[10px] mt-0.5">{pClass}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Cost estimate ─────────────────────────────────────────── */}
              {recommended&&costZAR!==null&&(
                <Card>
                  <SecHead title="Indicative Supply Cost" accent="amber"
                    sub={`${recommended.inch} ${vType.label} · ${pClass} · ${bodyMat.mat} · ${tk} trim · ${actType.label.split("(")[0].trim()} · Q2 2025 ZAR ±30%`}/>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Unit cost</p>
                      <p className="text-xl font-black text-amber-700 dark:text-amber-300">
                        R {(costZAR/(parseInt(valveQty)||1)).toLocaleString("en-ZA",{maximumFractionDigits:0})}
                      </p>
                      <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">per valve</p>
                    </div>
                    {parseInt(valveQty)>1&&(
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Total ({valveQty} valves)</p>
                        <p className="text-xl font-black text-amber-700 dark:text-amber-300">
                          R {costZAR.toLocaleString("en-ZA",{maximumFractionDigits:0})}
                        </p>
                      </div>
                    )}
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Pressure class</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{pClass}</p>
                      <p className="text-xs text-gray-400 mt-0.5">factor ×{CLASS_FACTOR[pClass]}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Trim premium</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{tk.replace("anticavitation","Anti-cavitation")}</p>
                      <p className="text-xs text-gray-400 mt-0.5">factor ×{TRIM_FACTOR[tk]}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    Indicative ZAR Q2 2025 supply price — body + trim + actuator. Excludes installation, commissioning, and instrumentation.
                    Typical variation ±30%. Obtain vendor quotations before budgeting. SS body ×2.5, alloy ×1.75 vs CS base.
                  </p>
                </Card>
              )}

              {/* ── Calculation summary ──────────────────────────────────── */}
              <Card>
                <SecHead title="Calculation Summary" accent="gray"
                  sub={`IEC 60534-2-1 · ${vType.label} · F_L = ${vType.FL} · x_T = ${vType.xT}`}/>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    {label:"P_1 (bar_a)",    value:fmt((TO_BARA[P1unit]?.(parseFloat(P1val)))??0,3)},
                    {label:"ΔP (bar)",        value:fmt(parseFloat(dPval)*(TO_DPBAR[dPunit]??1),3)},
                    ...(res.service==="liquid"?[
                      {label:"ΔP_choked (bar)", value:fmt((res as LiqResult).dPchoked,3)},
                      {label:"ΔP_eff (bar)",    value:fmt((res as LiqResult).dPeff,3)},
                      {label:"F_F factor",      value:fmt((res as LiqResult).FF,3)},
                      {label:"SG",              value:fmt(SG,3)},
                    ]:[
                      {label:"x = ΔP/P_1",     value:fmt((res as GasResult).x,3)},
                      {label:"x_T (choked)",    value:fmt((res as GasResult).xChoked,3)},
                      {label:"Y (expansion)",   value:fmt((res as GasResult).Y,3)},
                      {label:"T_1 (°C)",        value:fmt(parseFloat(T1val),0)},
                    ]),
                    {label:"Kv required",     value:fmt(res.Kv,2)},
                    {label:"Cv required",     value:fmt(res.Cv,2)},
                    {label:"Cv × margin",     value:fmt(res.Cv*(parseFloat(cvMargin)||1.25),1)},
                  ] as {label:string;value:string}[]).map(item=>(
                    <div key={item.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5"><Lbl>{item.label}</Lbl></p>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
                  Fp = 1.0 assumed (valve body same size as pipe — no reducers). If reducers are installed, actual Kv/Cv will be lower — add 10–15% margin.
                  Verify with manufacturer sizing software before issuing purchase specification.
                </p>
              </Card>
            </>
          )}

          <References refs={REFS_CONTROL_VALVE} />
        </div>
      </div>
    </div>
  );
}
