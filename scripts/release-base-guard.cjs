"use strict";
// Official stable releases are the authority, not a branch name or a copied version.
const {execFileSync}=require("node:child_process");
const APPS=Object.freeze({
 public:{dir:"mobile",prefix:"android-v",file:"SHALOM-Android-v",id:"com.shalomcoroacordes.cancionero"},
 admin:{dir:"admin-mobile",prefix:"admin-v",file:"SHALOM-Admin-v",id:"com.shalomcoroacordes.admin"}
});
const versionPattern=/^\d+\.\d+\.\d+$/;
function compareVersion(a,b){
 if(!versionPattern.test(a)||!versionPattern.test(b))throw Error("Versión no válida: "+a+" / "+b);
 const aa=a.split(".").map(Number),bb=b.split(".").map(Number);
 for(let i=0;i<3;i++)if(aa[i]!==bb[i])return aa[i]>bb[i]?1:-1;
 return 0;
}
function latestStable(releases,app){
 const cfg=APPS[app];
 if(!cfg)throw Error("Aplicación desconocida");
 const candidates=releases.filter(r=>!r.draft&&!r.prerelease&&r.published_at&&typeof r.tag_name==="string"&&r.tag_name.startsWith(cfg.prefix)&&versionPattern.test(r.tag_name.slice(cfg.prefix.length)));
 candidates.sort((a,b)=>compareVersion(b.tag_name.slice(cfg.prefix.length),a.tag_name.slice(cfg.prefix.length)));
 const release=candidates[0];
 if(!release)throw Error("No se encontró release oficial de "+app);
 const version=release.tag_name.slice(cfg.prefix.length);
 if(!release.assets?.some(a=>a.name===cfg.file+version+".apk"&&a.state==="uploaded"&&a.size>0))throw Error("Falta el APK oficial de "+release.tag_name);
 return {tag:release.tag_name,version};
}
function manifestIdentity(manifests,app){
 const config=manifests.app?.expo,pkg=manifests.pkg,lock=manifests.lock;
 if(!config||config.android?.package!==APPS[app].id||config.version!==pkg?.version||!versionPattern.test(config.version)||!Number.isSafeInteger(config.android.versionCode)||config.android.versionCode<=0)throw Error("Identidad/versiones inconsistentes de "+app);
 if(!lock||lock.version!==config.version||lock.packages?.[""]?.version!==config.version)throw Error("Lockfile no sincronizado de "+app);
 return {version:config.version,code:config.android.versionCode};
}
// GitHub Pages uses a separate dynamic deployment workflow. Only a successful
// actual deployment is a web baseline; a push, failed build or preview is not.
function latestWebDeployment(runs){
 const candidates=runs.filter(r=>r.path==="dynamic/pages/pages-build-deployment"&&r.event==="dynamic"&&r.head_branch==="main"&&r.status==="completed"&&r.conclusion==="success");
 candidates.sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at)||b.id-a.id);
 const run=candidates[0];
 if(!run||!Number.isSafeInteger(run.id)||!Number.isFinite(Date.parse(run.updated_at))||!/^[a-f0-9]{40}$/.test(run.head_sha||""))throw Error("No se pudo identificar el último despliegue exitoso de GitHub Pages");
 return {sha:run.head_sha,id:run.id};
}
function verifyWebDeployment(jobs){
 if(!jobs.some(j=>j.name==="deploy"&&j.conclusion==="success"&&j.steps?.some(s=>s.name==="Deploy to GitHub Pages"&&s.conclusion==="success")))throw Error("GitHub Pages: no consta una publicación web exitosa");
}
function validate({releases,webBase,head,resolveTag,readManifests,isAncestor,publish,approvedSha}){
 if(publish&&(!APPS[publish]||!/^[a-f0-9]{40}$/.test(approvedSha||"")||head!==approvedSha))throw Error("Publicación exige aplicación válida y SHA exacto aprobado");
 if(!webBase||!/^[a-f0-9]{40}$/.test(webBase.sha||"")||!Number.isSafeInteger(webBase.id))throw Error("Falta la referencia de despliegue web oficial");
 const results=[];
 for(const app of Object.keys(APPS)){
  const latest=latestStable(releases,app),sha=resolveTag(latest.tag);
  const stable=manifestIdentity(readManifests(sha,app),app);
  if(stable.version!==latest.version)throw Error("Tag y manifiesto oficial difieren: "+latest.tag);
  if(!isAncestor(sha,head))throw Error("BASE OBSOLETA: "+latest.tag+" ("+sha+") no es ancestro de "+head+". Integrar la release oficial antes de continuar.");
  const candidate=manifestIdentity(readManifests(head,app),app);
  if(compareVersion(candidate.version,stable.version)<0||candidate.code<stable.code)throw Error("Retroceso de versión/versionCode en "+app);
  if(publish===app&&(compareVersion(candidate.version,stable.version)<=0||candidate.code<=stable.code))throw Error("Publicación exige versión y versionCode mayores que "+latest.tag+" / "+stable.code);
  results.push({app,tag:latest.tag,sha,stable,candidate});
 }
 if(!isAncestor(webBase.sha,head))throw Error("BASE WEB OBSOLETA: GitHub Pages ("+webBase.sha+", ejecución "+webBase.id+") no es ancestro de "+head+". Integrar el despliegue oficial antes de continuar.");
 return results;
}
function cli(args){
 const read=(cmd,argv)=>execFileSync(cmd,argv,{encoding:"utf8",maxBuffer:32*1024*1024,stdio:["ignore","pipe","pipe"]}).trim();
 const git=(...args)=>read("git",args);
 const repo=process.env.GITHUB_REPOSITORY||"shalomcoroacordes-a11y/Shalom";
 if(repo.toLowerCase()!=="shalomcoroacordes-a11y/shalom")throw Error("Repositorio distinto de SHALOM");
 let ref="HEAD",publish=null,approvedSha=null;
 for(let i=0;i<args.length;i++){
  const flag=args[i],value=args[++i];
  if(!value||!["--ref","--publish","--approved-sha"].includes(flag))throw Error("Argumento inválido: "+flag);
  if(flag==="--ref")ref=value;
  if(flag==="--publish")publish=value;
  if(flag==="--approved-sha")approvedSha=value;
 }
 if(ref.startsWith("-"))throw Error("Referencia inválida");
 const head=git("rev-parse","--verify",ref+"^{commit}");
 if(publish&&head!==git("rev-parse","HEAD"))throw Error("Publicar solo el commit actual");
 // Read every page; never trust /releases/latest (two independent app tracks).
 const releases=JSON.parse(read("gh",["api","--paginate","--slurp","repos/"+repo+"/releases?per_page=100"])).flat();
 // Project API results down to fields used by the guard before capturing stdout.
 const pages=read("gh",["api","--paginate","repos/"+repo+"/actions/runs?event=dynamic&status=success&branch=main&per_page=100","--jq",".workflow_runs[] | {id,head_sha,path,event,head_branch,status,conclusion,updated_at}"]).split("\n").filter(Boolean).map(line=>JSON.parse(line));
 const webBase=latestWebDeployment(pages);
 const jobs=JSON.parse(read("gh",["api","--paginate","--slurp","repos/"+repo+"/actions/runs/"+webBase.id+"/jobs?per_page=100"])).flatMap(page=>page.jobs);
 verifyWebDeployment(jobs);
 // Fetch the exact SHA, not a mutable branch; no force-update of any local ref.
 git("fetch","--no-tags","origin",webBase.sha);
 const resolveTag=tag=>{
  git("fetch","--no-tags","origin","refs/tags/"+tag+":refs/tags/"+tag);
  return git("rev-parse","--verify","refs/tags/"+tag+"^{commit}");
 };
 const readManifests=(sha,app)=>{
  const dir=APPS[app].dir,readJson=file=>JSON.parse(git("show",sha+":"+dir+"/"+file));
  return {app:readJson("app.json"),pkg:readJson("package.json"),lock:readJson("package-lock.json")};
 };
 const isAncestor=(base,next)=>{try{git("merge-base","--is-ancestor",base,next);return true;}catch(e){if(e.status===1)return false;throw e;}};
 const results=validate({releases,webBase,head,resolveTag,readManifests,isAncestor,publish,approvedSha});
 for(const r of results)console.log(r.app+": "+r.tag+" ("+r.sha+") -> "+r.candidate.version+" / "+r.candidate.code);
 console.log("web: GitHub Pages ("+webBase.sha+", ejecución "+webBase.id+") -> "+head);
 console.log("SHALOM: base oficial y versiones verificadas para "+head);
}
if(require.main===module){try{cli(process.argv.slice(2));}catch(e){console.error("SHALOM RELEASE GUARD: "+e.message);process.exitCode=1;}}
module.exports={APPS,compareVersion,latestStable,manifestIdentity,latestWebDeployment,verifyWebDeployment,validate};
