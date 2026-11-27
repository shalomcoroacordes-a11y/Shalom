// Timings reproduce the approved microinteraction prototype.
const motion=Object.freeze({press:170,release:170,page:240,nav:340,heartUp:176,heartDown:144,pressScale:.94,pageOffset:7,heartStart:.7,heartPeak:1.27});
function navGeometry(width,count,index){
 if(!Number.isFinite(width)||width<=8||!Number.isInteger(count)||count<1||index<0||index>=count)return null;
 const cell=(width-8)/count;
 const size=Math.min(46,cell-2);
 if(size<=0)return null;
 return {width:size,x:4+cell*index+(cell-size)/2};
}
module.exports=Object.freeze({motion,navGeometry});
