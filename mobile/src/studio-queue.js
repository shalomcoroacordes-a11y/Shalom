// Local practice queue. No navigation, persistence or native dependencies.
function startStudioQueue(plan,index=0){
 const ready=plan.ready||[];
 if(!ready[index])return null;
 return {queue:{entries:ready,index},payload:ready[index].payload};
}
function advanceStudioQueue(queue,delta){
 if(!queue)return null;
 const index=queue.index+delta,entry=queue.entries[index];
 return entry?{queue:{...queue,index},payload:entry.payload}:null;
}
module.exports=Object.freeze({startStudioQueue,advanceStudioQueue});
