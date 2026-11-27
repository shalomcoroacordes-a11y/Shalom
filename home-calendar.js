/* Independent read-only Home summary. Catalog search and recent cards retain their existing owner. */
(()=>{
 const root=document.getElementById("homeCalendarSummary"),P=window.ShalomPublicCalendar,W=window.ShalomCalendarWebCore,db=window.supabaseClient;
 if(!root||!P||!W)return;
 const day=W.today();
 root.innerHTML=P.homeSummary([],day,db?"loading":"error");
 if(!db)return;
 (async()=>{try{
  const {data,error}=await db.from("repertoires").select("id,title,kind,event_date,items,is_published").eq("is_published",true).gte("event_date",day).order("event_date",{ascending:true}).limit(30);
  if(error)throw error;
  root.innerHTML=P.homeSummary(data||[],day);
 }catch(_){root.innerHTML=P.homeSummary([],day,"error");}})();
})();
