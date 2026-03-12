import { useState, useEffect } from "react";

const TEAL = "#0D9488";
const TEAL_LIGHT = "#CCFBF1";
const TEAL_DARK = "#0F766E";

const SPECIALITES = [
  { id:"all",        label:"Toutes",            icon:"🗂️" },
  { id:"cardio",     label:"Cardiologie",        icon:"❤️" },
  { id:"pneumo",     label:"Pneumologie",        icon:"🫁" },
  { id:"neuro",      label:"Neurologie",         icon:"🧠" },
  { id:"gastro",     label:"Gastro-entérologie", icon:"🫃" },
  { id:"endocrino",  label:"Endocrinologie",     icon:"⚗️" },
  { id:"infectio",   label:"Infectiologie",      icon:"🦠" },
  { id:"hemato",     label:"Hématologie",        icon:"🩸" },
  { id:"rhumato",    label:"Rhumatologie",       icon:"🦴" },
  { id:"nephro",     label:"Néphrologie",        icon:"🫘" },
  { id:"dermato",    label:"Dermatologie",       icon:"🧬" },
  { id:"psychiatrie",label:"Psychiatrie",        icon:"🧩" },
  { id:"urgences",   label:"Urgences/Trauma",    icon:"🚨" },
  { id:"pediatrie",  label:"Pédiatrie",          icon:"👶" },
  { id:"vasculaire", label:"Vasculaire",         icon:"🩺" },
];

function detectSpecialite(fiche) {
  const txt = (fiche.titre + " " + (fiche.definition||"")).toLowerCase();
  if (/cardio|infarctus|coronar|cardiaque|valvul|arythmie|fibrillation|insuffisance card/.test(txt)) return "cardio";
  if (/pulmonaire|bronch|asthme|bpco|pneumo|pleural|respirat|alvéol/.test(txt)) return "pneumo";
  if (/neuro|cérébr|épileps|parkinson|alzheimer|sclérose|migraine|avc|méningo|neuropath/.test(txt)) return "neuro";
  if (/gastro|hépatite|cirrhose|crohn|colite|intestin|côlon|pancréat|ulcère|digestif/.test(txt)) return "gastro";
  if (/diabète|thyroïd|surrén|hypophyse|hormone|endocrin|insuline|cortisol/.test(txt)) return "endocrino";
  if (/infect|bactér|virus|sepsis|antibio|paludisme|tuberculose|vih|sida|parasit/.test(txt)) return "infectio";
  if (/leucémie|lymphome|anémie|thrombose|hémato|plaquette|coagul|hémophil/.test(txt)) return "hemato";
  if (/arthrite|arthrose|lupus|rhumat|spondyl|goutte|ostéopor/.test(txt)) return "rhumato";
  if (/rénale|néphro|glomérul|dialyse|protéinurie|rein/.test(txt)) return "nephro";
  if (/dermato|cutané|psoriasis|eczéma|mélanome|peau|acné/.test(txt)) return "dermato";
  if (/psychiatr|dépression|schizophrénie|anxiété|bipolaire|trouble mental|psychos/.test(txt)) return "psychiatrie";
  if (/trauma|fracture|urgence|choc|brûlure|polytraumatism/.test(txt)) return "urgences";
  if (/pédiatr|enfant|néonatal|congénital|nourrisson/.test(txt)) return "pediatrie";
  if (/vasculaire|artérite|anévrisme|phlébite|embolie|aorte|ischémie/.test(txt)) return "vasculaire";
  return "all";
}

// ── Stockage local (remplace window.storage de Claude.ai) ───────────────────
const storage = {
  async get(key) {
    try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return null; }
  },
  async list(prefix) {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      return { keys };
    } catch { return { keys: [] }; }
  },
  async delete(key) {
    try { localStorage.removeItem(key); return true; } catch { return null; }
  }
};

// ── API Claude ───────────────────────────────────────────────────────────────
const SYSTEM_INTRO = `Tu es un médecin expert. L'utilisateur peut écrire avec des fautes d'orthographe ou en langage courant. Identifie toujours la pathologie correcte. Génère UNIQUEMENT un JSON valide :
{"titre_corrige": "Nom médical officiel", "intro": "2-3 phrases présentant la pathologie pour un étudiant en médecine."}`;

const SYSTEM_FICHE = `Tu es un assistant médical expert. Utilise HAS, ESC, AHA, OMS, UpToDate, Cochrane.
Réponds UNIQUEMENT en JSON valide, sans backticks, sans texte autour.
Règles : chaque tableau a minimum 1 élément, JSON syntaxiquement parfait.
Structure EXACTE :
{
  "titre": "Nom officiel",
  "definition": "Définition précise en 2-3 phrases.",
  "physiopathologie": "Mécanisme en 3-5 points clés.",
  "clinique": {
    "population": "Qui est touché : âge, sexe, facteurs de risque",
    "symptomes_fonctionnels": ["Symptôme ressenti 1","Symptôme ressenti 2","Symptôme ressenti 3"],
    "signes_cliniques": ["Signe objectif 1","Signe objectif 2","Signe objectif 3"],
    "stades": [{"stade":"Stade I","description":"description"}]
  },
  "diagnostic": {
    "tests": ["Test 1","Test 2"],
    "examens": ["Examen 1","Examen 2"],
    "differentiel": ["DD1 - raison","DD2 - raison"]
  },
  "prise_en_charge": {
    "traitement": {
      "urgence": "Traitement immédiat ou Non applicable",
      "court_terme": "Traitement court terme",
      "long_terme": "Traitement long terme"
    },
    "mesures": ["Mesure 1","Mesure 2"]
  },
  "evolution": {
    "complications": ["Complication 1","Complication 2","Complication 3"],
    "pronostic": "Pronostic en 1-2 phrases."
  },
  "points_cles": ["Clé 1","Clé 2","Clé 3","Clé 4","Clé 5"]
}`;

function extractJSON(text) {
  let clean = text.trim()
    .replace(/^```json\s*/i,"").replace(/^```\s*/,"").replace(/\s*```$/,"").trim();
  const start = clean.indexOf("{"), end = clean.lastIndexOf("}");
  if (start===-1||end===-1) throw new Error("Aucun JSON trouvé");
  clean = clean.slice(start,end+1);
  try { return JSON.parse(clean); }
  catch { return JSON.parse(clean.replace(/:\s*"([^"]*)\n([^"]*)"/g,': "$1 $2"')); }
}

async function callClaudeOnce(systemPrompt, userText, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "anthropic-version":"2023-06-01",
      "anthropic-dangerous-direct-browser-access":"true",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:8096, system:systemPrompt, messages:[{role:"user",content:userText}] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`API ${res.status} : ${data.error?.message||JSON.stringify(data)}`);
  const text = data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
  return extractJSON(text);
}

async function callClaude(systemPrompt, userText, apiKey, maxRetries=3) {
  let lastError;
  for (let i=0;i<maxRetries;i++) {
    try { return await callClaudeOnce(systemPrompt,userText,apiKey); }
    catch(e) {
      lastError=e;
      if (e.message.includes("401")||e.message.includes("403")) throw new Error("Clé API invalide. Vérifiez sur console.anthropic.com");
      if (e.message.includes("429")) throw new Error("Crédits épuisés. Rechargez sur console.anthropic.com");
      if (i<maxRetries-1) await new Promise(r=>setTimeout(r,1000*(i+1)));
    }
  }
  throw lastError;
}

// ── Impression PDF ───────────────────────────────────────────────────────────
function printFiche(data) {
  const w = window.open("","_blank","width=900,height=700");
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Fiche – ${data.titre}</title>
<style>
  body{font-family:'Segoe UI',sans-serif;max-width:800px;margin:30px auto;padding:20px;color:#1E293B}
  h1{font-size:22px;font-weight:800;margin:0}h2{font-size:15px;font-weight:700;color:#0D9488;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px}
  .hdr{background:linear-gradient(135deg,#0D9488,#0F766E);color:white;border-radius:12px;padding:20px 22px;margin-bottom:12px}
  .lbl{font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
  .card{background:white;border:1px solid #E2E8F0;border-radius:10px;padding:14px 16px;margin-bottom:10px}
  .def{background:#CCFBF1;border-left:4px solid #0D9488}.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
  .trt{background:#F8FAFC;border-radius:8px;padding:8px 10px;border:1px solid #E2E8F0}.tl{font-size:10px;font-weight:700;color:#0D9488;margin-bottom:3px}
  ul{margin:4px 0 0;padding-left:0;list-style:none}li{display:flex;gap:7px;margin-bottom:4px;font-size:11px;color:#334155;line-height:18px}li::before{content:"›";color:#0D9488;font-weight:700}
  .badge{background:#0D948820;color:#0D9488;border:1px solid #0D948840;border-radius:20px;padding:2px 9px;font-size:10px;font-weight:600;display:inline-block;margin:0 4px 4px 0}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}th{background:#0D9488;color:white;padding:5px 10px;text-align:left}td{padding:5px 10px;border-bottom:1px solid #E2E8F0}
  .nc{display:flex;align-items:center;gap:8px;margin-bottom:8px}.num{background:#0D9488;color:white;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
  .ki{display:flex;gap:8px;align-items:flex-start;background:white;border-radius:7px;padding:7px 10px;border:1px solid #0D948820;margin-bottom:6px}
  .no-print{background:#0D9488;color:white;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;border-radius:0 0 10px 10px}
  @media print{.no-print{display:none}body{margin:5px}}
</style></head><body>
<div class="no-print"><span style="font-size:12px;font-weight:600">📥 Fichier → Imprimer → Enregistrer en PDF</span><button onclick="window.print()" style="background:white;color:#0D9488;border:none;border-radius:8px;padding:7px 16px;font-size:12px;font-weight:700;cursor:pointer">Télécharger PDF ↓</button></div>
<div class="hdr"><div style="font-size:10px;opacity:.8;text-transform:uppercase;margin-bottom:3px">FICHE PATHOLOGIE</div><h1>${data.titre}</h1></div>
<div class="card def"><div class="nc"><span class="num">1</span><h2>Définition</h2></div><p style="font-size:11px;line-height:18px;font-style:italic">${data.definition}</p></div>
<div class="card"><div class="nc"><span class="num">2</span><h2>Physiopathologie</h2></div><p style="font-size:11px;line-height:18px">${data.physiopathologie}</p></div>
<div class="card"><div class="nc"><span class="num">3</span><h2>Clinique</h2></div>
  <div class="lbl">👥 Qui est touché ?</div><p style="font-size:11px;margin:0 0 8px">${data.clinique?.population||""}</p>
  <div class="lbl">🤒 Symptômes</div><ul>${(data.clinique?.symptomes_fonctionnels||[]).map(s=>`<li>${s}</li>`).join("")}</ul>
  <div class="lbl" style="margin-top:8px">🔍 Signes cliniques</div><ul>${(data.clinique?.signes_cliniques||[]).map(s=>`<li>${s}</li>`).join("")}</ul>
  ${data.clinique?.stades?.length?`<div class="lbl" style="margin-top:8px">Stades</div><table><tr><th>Stade</th><th>Description</th></tr>${data.clinique.stades.map(s=>`<tr><td><b>${s.stade}</b></td><td>${s.description}</td></tr>`).join("")}</table>`:""}
</div>
<div class="card"><div class="nc"><span class="num">4</span><h2>Diagnostic</h2></div>
  <div class="g2"><div><div class="lbl">Tests</div><ul>${(data.diagnostic?.tests||[]).map(x=>`<li>${x}</li>`).join("")}</ul></div>
  <div><div class="lbl">Examens</div><ul>${(data.diagnostic?.examens||[]).map(x=>`<li>${x}</li>`).join("")}</ul></div></div>
  <div style="margin-top:8px"><div class="lbl">Diagnostic différentiel</div>${(data.diagnostic?.differentiel||[]).map(x=>`<span class="badge">${x}</span>`).join("")}</div>
</div>
<div class="card"><div class="nc"><span class="num">5</span><h2>Prise en charge</h2></div>
  <div class="g3">
    <div class="trt"><div class="tl">🚨 Urgence</div><p style="font-size:11px">${data.prise_en_charge?.traitement?.urgence||""}</p></div>
    <div class="trt"><div class="tl">⏱ Court terme</div><p style="font-size:11px">${data.prise_en_charge?.traitement?.court_terme||""}</p></div>
    <div class="trt"><div class="tl">♾ Long terme</div><p style="font-size:11px">${data.prise_en_charge?.traitement?.long_terme||""}</p></div>
  </div>
  <div style="margin-top:8px"><div class="lbl">Mesures</div><ul>${(data.prise_en_charge?.mesures||[]).map(x=>`<li>${x}</li>`).join("")}</ul></div>
</div>
<div class="card"><div class="nc"><span class="num">6</span><h2>Évolution & Pronostic</h2></div>
  <div class="g2"><div><div class="lbl">Complications</div><ul>${(data.evolution?.complications||[]).map(x=>`<li>${x}</li>`).join("")}</ul></div>
  <div><div class="lbl">Pronostic</div><p style="font-size:11px">${data.evolution?.pronostic||""}</p></div></div>
</div>
<div class="card"><div class="nc"><span class="num">7</span><h2>Points clés</h2></div>
  ${(data.points_cles||[]).map((pt,i)=>`<div class="ki"><span class="num">${i+1}</span><span style="font-size:11px;font-weight:500">${pt}</span></div>`).join("")}
</div>
<script>window.onload=()=>{window.print()}<\/script></body></html>`);
  w.document.close();
}

// ── UI helpers ───────────────────────────────────────────────────────────────
const SectionTitle = ({n,title}) => (
  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
    <div style={{background:TEAL,color:"white",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{n}</div>
    <h2 style={{margin:0,fontSize:15,fontWeight:700,color:TEAL,textTransform:"uppercase",letterSpacing:".05em"}}>{title}</h2>
  </div>
);
const Card = ({children,s={}}) => <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:12,padding:"16px 18px",marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)",...s}}>{children}</div>;
const Lbl = ({t}) => <div style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>{t}</div>;
const Bullets = ({items}) => {
  const safe = Array.isArray(items)?items:[];
  return <ul style={{margin:"4px 0 0",paddingLeft:0,listStyle:"none"}}>{safe.map((x,i)=><li key={i} style={{display:"flex",gap:7,marginBottom:4,alignItems:"flex-start"}}><span style={{color:TEAL,fontWeight:700,fontSize:13,lineHeight:"19px",flexShrink:0}}>›</span><span style={{fontSize:11,color:"#334155",lineHeight:"18px"}}>{x}</span></li>)}</ul>;
};
const Badge = ({c}) => <span style={{background:TEAL+"20",color:TEAL,border:`1px solid ${TEAL}40`,borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:600,display:"inline-block",marginRight:5,marginBottom:4}}>{c}</span>;
const StadesTable = ({stades}) => {
  if (!stades?.length) return null;
  return <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginTop:8}}>
    <thead><tr style={{background:TEAL}}><th style={{padding:"5px 10px",color:"white",textAlign:"left",width:"30%"}}>Stade</th><th style={{padding:"5px 10px",color:"white",textAlign:"left"}}>Description</th></tr></thead>
    <tbody>{stades.map((s,i)=><tr key={i} style={{background:i%2===0?"#F8FAFC":"white"}}><td style={{padding:"5px 10px",borderBottom:"1px solid #E2E8F0",fontWeight:600,color:TEAL_DARK}}>{s.stade}</td><td style={{padding:"5px 10px",borderBottom:"1px solid #E2E8F0",color:"#334155"}}>{s.description}</td></tr>)}</tbody>
  </table>;
};

function FicheHTML({d}) {
  d = {
    ...d,
    clinique:{...d.clinique,signes_cliniques:d.clinique?.signes_cliniques||[],symptomes_fonctionnels:d.clinique?.symptomes_fonctionnels||d.clinique?.signes||[],stades:d.clinique?.stades||[]},
    diagnostic:{tests:d.diagnostic?.tests||[],examens:d.diagnostic?.examens||[],differentiel:d.diagnostic?.differentiel||[]},
    prise_en_charge:{traitement:d.prise_en_charge?.traitement||{},mesures:d.prise_en_charge?.mesures||[]},
    evolution:{complications:d.evolution?.complications||[],pronostic:d.evolution?.pronostic||""},
    points_cles:d.points_cles||[],
  };
  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:`linear-gradient(135deg,${TEAL},${TEAL_DARK})`,borderRadius:14,padding:"20px 22px",marginBottom:14,color:"white"}}>
        <div style={{fontSize:10,opacity:.8,textTransform:"uppercase",letterSpacing:".1em",marginBottom:3}}>FICHE PATHOLOGIE</div>
        <h1 style={{margin:0,fontSize:22,fontWeight:800}}>{d.titre}</h1>
      </div>
      <Card s={{borderLeft:`4px solid ${TEAL}`,background:TEAL_LIGHT}}><SectionTitle n="1" title="Définition"/><p style={{margin:0,fontSize:11,color:"#1E293B",lineHeight:"18px",fontStyle:"italic"}}>{d.definition}</p></Card>
      <Card><SectionTitle n="2" title="Physiopathologie"/><p style={{margin:0,fontSize:11,color:"#334155",lineHeight:"18px"}}>{d.physiopathologie}</p></Card>
      <Card><SectionTitle n="3" title="Clinique"/>
        <div style={{display:"grid",gap:12}}>
          <div><Lbl t="👥 Qui est touché ?"/><p style={{margin:0,fontSize:11,color:"#334155"}}>{d.clinique.population}</p></div>
          <div><Lbl t="🤒 Symptômes ressentis"/><Bullets items={d.clinique.symptomes_fonctionnels}/></div>
          {d.clinique.signes_cliniques.length>0&&<div><Lbl t="🔍 Signes à l'examen"/><Bullets items={d.clinique.signes_cliniques}/></div>}
          {d.clinique.stades?.length>0&&<div><Lbl t="📊 Classification"/><StadesTable stades={d.clinique.stades}/></div>}
        </div>
      </Card>
      <Card><SectionTitle n="4" title="Diagnostic"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><Lbl t="Tests cliniques"/><Bullets items={d.diagnostic.tests}/></div>
          <div><Lbl t="Examens complémentaires"/><Bullets items={d.diagnostic.examens}/></div>
        </div>
        <div style={{marginTop:10}}><Lbl t="Diagnostic différentiel"/><div style={{display:"flex",flexWrap:"wrap"}}>{d.diagnostic.differentiel.map((x,i)=><Badge key={i} c={x}/>)}</div></div>
      </Card>
      <Card><SectionTitle n="5" title="Prise en charge"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
          {[{label:"🚨 Urgence",v:d.prise_en_charge.traitement.urgence},{label:"⏱ Court terme",v:d.prise_en_charge.traitement.court_terme},{label:"♾ Long terme",v:d.prise_en_charge.traitement.long_terme}].map((t,i)=>(
            <div key={i} style={{background:"#F8FAFC",borderRadius:8,padding:"9px 11px",border:"1px solid #E2E8F0"}}>
              <div style={{fontSize:10,fontWeight:700,color:TEAL,marginBottom:3}}>{t.label}</div>
              <p style={{margin:0,fontSize:11,color:"#334155",lineHeight:"17px"}}>{t.v}</p>
            </div>
          ))}
        </div>
        <Lbl t="Mesures associées"/><Bullets items={d.prise_en_charge.mesures}/>
      </Card>
      <Card><SectionTitle n="6" title="Évolution & Pronostic"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><Lbl t="Complications"/><Bullets items={d.evolution.complications}/></div>
          <div><Lbl t="Pronostic"/><p style={{margin:0,fontSize:11,color:"#334155",lineHeight:"18px"}}>{d.evolution.pronostic}</p></div>
        </div>
      </Card>
      <Card s={{background:`linear-gradient(135deg,${TEAL}10,${TEAL}05)`,border:`1px solid ${TEAL}30`}}><SectionTitle n="7" title="Points clés à retenir"/>
        <div style={{display:"grid",gap:7}}>
          {d.points_cles.map((pt,i)=>(
            <div key={i} style={{display:"flex",gap:9,alignItems:"flex-start",background:"white",borderRadius:8,padding:"7px 11px",border:`1px solid ${TEAL}20`}}>
              <span style={{background:TEAL,color:"white",borderRadius:"50%",width:19,height:19,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{i+1}</span>
              <span style={{fontSize:11,color:"#1E293B",fontWeight:500,lineHeight:"18px"}}>{pt}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BiblioCard({fiche,onOpen}) {
  const date = new Date(fiche.savedAt).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
  const sp = SPECIALITES.find(s=>s.id===detectSpecialite(fiche.data))||SPECIALITES[0];
  return (
    <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:12,padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
          <span>{sp.icon}</span>
          <span style={{fontWeight:700,fontSize:13,color:"#1E293B",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fiche.data.titre}</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <span style={{fontSize:10,background:TEAL+"15",color:TEAL,border:`1px solid ${TEAL}30`,borderRadius:20,padding:"1px 8px",fontWeight:600}}>{sp.label}</span>
          <span style={{fontSize:10,color:"#94A3B8"}}>{date}</span>
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexShrink:0}}>
        <button onClick={()=>onOpen(fiche)} style={{background:TEAL_LIGHT,color:TEAL,border:`1px solid ${TEAL}40`,borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>Ouvrir</button>
        <button onClick={()=>printFiche(fiche.data)} style={{background:`${TEAL}15`,color:TEAL,border:`1px solid ${TEAL}40`,borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>📥 PDF</button>
      </div>
    </div>
  );
}

// ── App principal ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("generate");
  const [query, setQuery] = useState("");
  const [step, setStep] = useState("idle");
  const [intro, setIntro] = useState("");
  const [fiche, setFiche] = useState(null);
  const [error, setError] = useState(null);
  const [fiches, setFiches] = useState([]);
  const [loadingStorage, setLoadingStorage] = useState(true);
  const [viewFiche, setViewFiche] = useState(null);
  const [alreadyExisted, setAlreadyExisted] = useState(false);
  const [searchBiblio, setSearchBiblio] = useState("");
  const [filtreSpecialite, setFiltreSpecialite] = useState("all");
  const [filtreOpen, setFiltreOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => { try { return localStorage.getItem("anthropic_key")||""; } catch { return ""; } });
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const keys = await storage.list("fiche:");
        const all = await Promise.all((keys?.keys||[]).map(async k => {
          try { const r = await storage.get(k); return r?JSON.parse(r.value):null; } catch { return null; }
        }));
        setFiches(all.filter(Boolean).sort((a,b)=>b.savedAt-a.savedAt));
      } catch {}
      setLoadingStorage(false);
    })();
  }, []);

  const saveFiche = async (data) => {
    const id = `fiche:${Date.now()}`;
    const entry = {id,data,savedAt:Date.now()};
    try { await storage.set(id,JSON.stringify(entry)); } catch {}
    setFiches(prev=>[entry,...prev]);
  };

  const saveKey = () => {
    const k = keyInput.trim();
    if (!k.startsWith("sk-ant-")) { alert("Clé invalide. Elle doit commencer par 'sk-ant-'"); return; }
    try { localStorage.setItem("anthropic_key",k); } catch {}
    setApiKey(k); setShowKeyModal(false); setKeyInput("");
  };

  const removeKey = () => {
    try { localStorage.removeItem("anthropic_key"); } catch {}
    setApiKey("");
  };

  const generate = async () => {
    if (!query.trim()) return;
    if (!apiKey) { setShowKeyModal(true); return; }
    setError(null); setFiche(null); setIntro(""); setStep("loadingIntro");
    try {
      const introData = await callClaude(SYSTEM_INTRO,`Pathologie : ${query}`,apiKey);
      const pathologieCorrigee = introData.titre_corrige||query;
      const normalize = s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[\s\-_'']/g,"");
      const existing = fiches.find(f=>normalize(f.data.titre)===normalize(pathologieCorrigee));
      if (existing) { setIntro(introData.intro); setFiche(existing.data); setStep("done"); setAlreadyExisted(true); return; }
      setAlreadyExisted(false); setIntro(introData.intro); setStep("loadingFiche");
      const ficheData = await callClaude(SYSTEM_FICHE,`Génère une fiche médicale complète pour : "${pathologieCorrigee}". Base-toi sur HAS, ESC, AHA, OMS, UpToDate, Cochrane. UNIQUEMENT le JSON.`,apiKey);
      setFiche(ficheData); await saveFiche(ficheData); setStep("done");
    } catch(e) { setError(e.message); setStep("idle"); }
  };

  const reset = () => { setStep("idle"); setQuery(""); setFiche(null); setIntro(""); setError(null); setAlreadyExisted(false); };
  const isLoading = step==="loadingIntro"||step==="loadingFiche";
  const TabBtn = ({id,label,count}) => (
    <button onClick={()=>{setTab(id);setViewFiche(null);}} style={{flex:1,padding:"10px 0",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"inherit",borderBottom:`3px solid ${tab===id?TEAL:"transparent"}`,background:"white",color:tab===id?TEAL:"#64748B"}}>
      {label}{count!=null&&<span style={{marginLeft:6,background:tab===id?TEAL:"#E2E8F0",color:tab===id?"white":"#64748B",borderRadius:20,padding:"1px 8px",fontSize:10,fontWeight:700}}>{count}</span>}
    </button>
  );

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#F0FDFA,#F8FAFC,#EFF6FF)",fontFamily:"'Segoe UI',system-ui,sans-serif",paddingBottom:60}}>

      {/* Modale clé API */}
      {showKeyModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"white",borderRadius:16,padding:28,maxWidth:480,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
            <div style={{fontSize:28,marginBottom:8,textAlign:"center"}}>🔑</div>
            <h2 style={{margin:"0 0 6px",fontSize:18,fontWeight:800,color:"#1E293B",textAlign:"center"}}>Clé API requise pour générer</h2>
            <p style={{margin:"0 0 16px",fontSize:13,color:"#64748B",textAlign:"center",lineHeight:"19px"}}>La bibliothèque est <strong>gratuite et accessible à tous</strong>.<br/>Pour générer de nouvelles fiches, entrez votre clé API Anthropic.</p>
            <div style={{background:"#F8FAFC",borderRadius:10,padding:"12px 14px",marginBottom:14,fontSize:12,color:"#64748B",lineHeight:"18px"}}>
              <strong style={{color:"#1E293B"}}>Obtenir une clé gratuite :</strong><br/>
              1. Allez sur <strong>console.anthropic.com</strong><br/>
              2. Créez un compte → "API Keys" → "Create Key"<br/>
              <span style={{color:TEAL,fontWeight:600}}>🎁 5$ de crédits offerts (~70 fiches gratuites)</span>
            </div>
            <input value={keyInput} onChange={e=>setKeyInput(e.target.value)} placeholder="sk-ant-api03-..." type="password"
              style={{width:"100%",border:"2px solid #E2E8F0",borderRadius:9,padding:"11px 14px",fontSize:13,outline:"none",fontFamily:"monospace",boxSizing:"border-box",marginBottom:12}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setShowKeyModal(false);setKeyInput("");}} style={{flex:1,background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:9,padding:"10px",fontSize:13,color:"#64748B",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Annuler</button>
              <button onClick={saveKey} disabled={!keyInput.trim()} style={{flex:2,background:keyInput.trim()?`linear-gradient(135deg,${TEAL},${TEAL_DARK})`:"#CBD5E1",border:"none",borderRadius:9,padding:"10px",fontSize:13,color:"white",cursor:keyInput.trim()?"pointer":"not-allowed",fontFamily:"inherit",fontWeight:700}}>Enregistrer →</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${TEAL_DARK},${TEAL})`,padding:"20px 32px 24px",color:"white"}}>
        <div style={{maxWidth:800,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:26}}>🩺</span>
            <div>
              <h1 style={{margin:0,fontSize:21,fontWeight:800}}>Générateur de Fiches Pathologies</h1>
              <p style={{margin:0,fontSize:11,opacity:.8}}>HAS · ESC · AHA · OMS · UpToDate · Cochrane · Powered by Claude AI</p>
            </div>
          </div>
          {apiKey?(
            <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.15)",borderRadius:20,padding:"5px 12px",flexShrink:0}}>
              <span style={{fontSize:11,color:"white",fontWeight:600}}>✅ Clé active</span>
              <button onClick={removeKey} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:10,padding:"2px 8px",fontSize:10,color:"white",cursor:"pointer"}}>Changer</button>
            </div>
          ):(
            <button onClick={()=>setShowKeyModal(true)} style={{background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.4)",borderRadius:20,padding:"6px 14px",fontSize:11,color:"white",cursor:"pointer",fontWeight:600,flexShrink:0}}>🔑 Ajouter ma clé API</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{maxWidth:800,margin:"0 auto",padding:"0 20px"}}>
        <div style={{display:"flex",background:"white",borderRadius:"0 0 12px 12px",border:"1px solid #E2E8F0",borderTop:"none",marginBottom:20,overflow:"hidden"}}>
          <TabBtn id="generate" label="✏️ Générateur"/>
          <TabBtn id="biblio" label="📚 Bibliothèque commune" count={fiches.length}/>
        </div>
      </div>

      <div style={{maxWidth:800,margin:"0 auto",padding:"0 20px"}}>

        {/* ── GÉNÉRATEUR ── */}
        {tab==="generate"&&(
          <>
            {(step==="idle"||isLoading)&&(
              <div style={{background:"white",borderRadius:14,padding:20,boxShadow:"0 4px 20px rgba(0,0,0,.06)",border:"1px solid #E2E8F0",marginBottom:16}}>
                <div style={{display:"flex",gap:10}}>
                  <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&generate()}
                    placeholder="Ex: Diabète de type 2, Insuffisance cardiaque, BPCO…"
                    disabled={isLoading}
                    style={{flex:1,border:"2px solid #E2E8F0",borderRadius:10,padding:"11px 15px",fontSize:14,outline:"none",fontFamily:"inherit",opacity:isLoading?.6:1}}/>
                  <button onClick={generate} disabled={isLoading||!query.trim()}
                    style={{background:isLoading?"#CBD5E1":`linear-gradient(135deg,${TEAL},${TEAL_DARK})`,color:"white",border:"none",borderRadius:10,padding:"11px 20px",fontSize:14,fontWeight:700,cursor:isLoading?"not-allowed":"pointer",minWidth:130,fontFamily:"inherit"}}>
                    {isLoading?"En cours…":"Générer →"}
                  </button>
                </div>
              </div>
            )}
            {error&&<div style={{padding:"10px 14px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,color:"#DC2626",fontSize:12,marginBottom:12}}>{error}</div>}
            {step==="loadingIntro"&&<div style={{textAlign:"center",padding:"30px 0"}}><div style={{fontSize:34}}>⚕️</div><p style={{color:TEAL,fontWeight:600,fontSize:14,margin:"10px 0 4px"}}>Analyse de la pathologie…</p></div>}
            {(step==="showIntro"||step==="loadingFiche"||step==="done")&&intro&&(
              <div style={{background:`linear-gradient(135deg,${TEAL}15,${TEAL}05)`,border:`1px solid ${TEAL}30`,borderRadius:14,padding:"16px 20px",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:18}}>🔬</span><span style={{fontSize:13,fontWeight:700,color:TEAL,textTransform:"uppercase"}}>{fiche?.titre||query}</span></div>
                <p style={{margin:0,fontSize:13,color:"#1E293B",lineHeight:"20px"}}>{intro}</p>
              </div>
            )}
            {step==="loadingFiche"&&(
              <div style={{textAlign:"center",padding:"14px 0"}}>
                <p style={{color:TEAL,fontWeight:600,fontSize:13,margin:"0 0 8px"}}>📋 Génération de la fiche complète…</p>
                <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:5}}>
                  {["HAS","ESC","AHA","OMS","UpToDate","Cochrane"].map(s=><span key={s} style={{background:TEAL+"15",color:TEAL,border:`1px solid ${TEAL}30`,borderRadius:20,padding:"2px 10px",fontSize:10,fontWeight:600}}>{s}</span>)}
                </div>
              </div>
            )}
            {step==="done"&&fiche&&(
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:8}}>
                  <button onClick={reset} style={{background:"white",border:"1px solid #E2E8F0",borderRadius:8,padding:"7px 14px",fontSize:12,color:"#64748B",cursor:"pointer",fontFamily:"inherit"}}>← Nouvelle fiche</button>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {alreadyExisted&&<span style={{background:"#FEF9C3",color:"#92400E",border:"1px solid #FDE68A",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:600}}>⚡ Déjà en bibliothèque</span>}
                    <button onClick={()=>printFiche(fiche)} style={{background:`linear-gradient(135deg,${TEAL},${TEAL_DARK})`,border:"none",borderRadius:8,padding:"7px 16px",fontSize:12,color:"white",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>📥 Télécharger PDF</button>
                  </div>
                </div>
                <FicheHTML d={fiche}/>
              </>
            )}
            {step==="idle"&&(
              <div style={{textAlign:"center",color:"#94A3B8",paddingTop:10}}>
                <div style={{fontSize:44}}>📋</div>
                <p style={{fontSize:13}}>Entrez une pathologie pour générer votre fiche médicale complète</p>
                {!apiKey&&<p style={{fontSize:12,color:TEAL,fontWeight:600,marginTop:6,cursor:"pointer"}} onClick={()=>setShowKeyModal(true)}>🔑 Ajouter ma clé API pour commencer →</p>}
              </div>
            )}
          </>
        )}

        {/* ── BIBLIOTHÈQUE ── */}
        {tab==="biblio"&&(
          <>
            {viewFiche?(
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:8}}>
                  <button onClick={()=>setViewFiche(null)} style={{background:"white",border:"1px solid #E2E8F0",borderRadius:8,padding:"7px 14px",fontSize:12,color:"#64748B",cursor:"pointer",fontFamily:"inherit"}}>← Bibliothèque</button>
                  <button onClick={()=>printFiche(viewFiche.data)} style={{background:`linear-gradient(135deg,${TEAL},${TEAL_DARK})`,border:"none",borderRadius:8,padding:"7px 16px",fontSize:12,color:"white",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>📥 Télécharger PDF</button>
                </div>
                <FicheHTML d={viewFiche.data}/>
              </>
            ):loadingStorage?(
              <div style={{textAlign:"center",padding:"40px 0",color:"#94A3B8"}}><div style={{fontSize:32}}>⏳</div><p>Chargement…</p></div>
            ):(
              <>
                <div style={{background:"white",borderRadius:12,padding:"14px 16px",marginBottom:12,border:"1px solid #E2E8F0"}}>
                  <input value={searchBiblio} onChange={e=>setSearchBiblio(e.target.value)}
                    placeholder="🔍 Rechercher une pathologie dans la bibliothèque…"
                    style={{width:"100%",border:"2px solid #E2E8F0",borderRadius:9,padding:"9px 14px",fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                </div>
                <div style={{marginBottom:14,position:"relative"}}>
                  <button onClick={()=>setFiltreOpen(o=>!o)}
                    style={{display:"flex",alignItems:"center",gap:8,background:"white",border:`1.5px solid ${filtreSpecialite!=="all"?TEAL:"#E2E8F0"}`,borderRadius:10,padding:"9px 16px",fontSize:13,fontWeight:600,color:filtreSpecialite!=="all"?TEAL:"#64748B",cursor:"pointer",fontFamily:"inherit",width:"100%",justifyContent:"space-between",boxSizing:"border-box"}}>
                    <span>{SPECIALITES.find(s=>s.id===filtreSpecialite)?.icon} {filtreSpecialite==="all"?"Filtrer par spécialité":SPECIALITES.find(s=>s.id===filtreSpecialite)?.label}</span>
                    <span style={{fontSize:11,display:"inline-block",transform:filtreOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}}>▼</span>
                  </button>
                  {filtreOpen&&(
                    <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"white",border:"1px solid #E2E8F0",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,.1)",zIndex:100,maxHeight:320,overflowY:"auto"}}>
                      {SPECIALITES.map(sp=>(
                        <div key={sp.id} onClick={()=>{setFiltreSpecialite(sp.id);setFiltreOpen(false);}}
                          style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",cursor:"pointer",background:filtreSpecialite===sp.id?TEAL+"10":"white",borderBottom:"1px solid #F1F5F9",color:filtreSpecialite===sp.id?TEAL:"#334155",fontWeight:filtreSpecialite===sp.id?700:400,fontSize:13}}>
                          <span>{sp.icon}</span><span>{sp.label}</span>
                          {filtreSpecialite===sp.id&&<span style={{marginLeft:"auto",color:TEAL}}>✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {(()=>{
                  const norm = s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
                  const filtered = fiches.filter(f=>{
                    const matchSearch = !searchBiblio||norm(f.data.titre).includes(norm(searchBiblio));
                    const matchSp = filtreSpecialite==="all"||detectSpecialite(f.data)===filtreSpecialite;
                    return matchSearch&&matchSp;
                  });
                  if (fiches.length===0) return (
                    <div style={{textAlign:"center",padding:"40px 0",color:"#94A3B8"}}>
                      <div style={{fontSize:48}}>📚</div>
                      <p style={{fontSize:13}}>Aucune fiche encore générée.<br/>Soyez le premier à en créer une !</p>
                      <button onClick={()=>setTab("generate")} style={{background:`linear-gradient(135deg,${TEAL},${TEAL_DARK})`,color:"white",border:"none",borderRadius:10,padding:"10px 22px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginTop:8}}>Créer une fiche →</button>
                    </div>
                  );
                  return (
                    <>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <span style={{fontSize:12,color:"#64748B",fontWeight:600}}>{filtered.length} fiche{filtered.length>1?"s":""} trouvée{filtered.length>1?"s":""}</span>
                        <button onClick={()=>setTab("generate")} style={{background:`linear-gradient(135deg,${TEAL},${TEAL_DARK})`,color:"white",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Nouvelle fiche</button>
                      </div>
                      {filtered.length===0?(
                        <div style={{textAlign:"center",padding:"30px 0",color:"#94A3B8"}}>
                          <div style={{fontSize:36}}>🔍</div>
                          <p style={{fontSize:13}}>Aucune fiche trouvée.<br/><span style={{color:TEAL,cursor:"pointer",fontWeight:600}} onClick={()=>setTab("generate")}>Générer cette pathologie →</span></p>
                        </div>
                      ):(
                        <div style={{display:"grid",gap:8}}>{filtered.map(f=><BiblioCard key={f.id} fiche={f} onOpen={setViewFiche}/>)}</div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
