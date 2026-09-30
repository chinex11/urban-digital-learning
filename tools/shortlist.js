// Lists short fields for a track so they can be expanded: node tools/shortlist.js <track>
const vm=require("vm"),fs=require("fs");const ctx={window:{}};ctx.window.window=ctx.window;vm.createContext(ctx);
const id=process.argv[2];
for(const f of ["data/catalog.js","tracks/"+id+".js"]){vm.runInContext("var UDL_T=window.UDL_T;",ctx);vm.runInContext(fs.readFileSync("www/"+f,"utf8"),ctx);}
const t=ctx.window.UDL_TRACKS.find(x=>x.id==id);
t.tiers.forEach(tr=>tr.modules.forEach(m=>m.lessons.forEach(l=>{
  l.q.forEach(q=>{if(q[3].length<20)console.log("Q\t"+JSON.stringify(q[3])+"\t"+q[0]+" => "+q[1][q[2]])});
  if(l.lab.s.length<30)console.log("S\t"+JSON.stringify(l.lab.s));
  l.lab.do.forEach(s=>{if(s.length<12)console.log("D\t"+JSON.stringify(s)+"\t("+l.t+")")});
  if(l.c.length<140)console.log("C\t"+l.t+"\t"+l.c.length);
  if(l.cap.length<30)console.log("P\t"+JSON.stringify(l.cap));
})));
