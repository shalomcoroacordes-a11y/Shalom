/* SHALOM Studio: pure geometry for reading, pinch zoom and lyric following. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.ShalomStudioReadingGeometry=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
function clampScoreFont(value){return Number.isFinite(value)?Math.min(46,Math.max(10,Math.round(value*10)/10)):16;}
function touchDistance(touches){return Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);}
function touchCenter(touches){return {x:(touches[0].clientX+touches[1].clientX)/2,y:(touches[0].clientY+touches[1].clientY)/2};}

function pinchFont(initial,initialDistance,distance){return initialDistance>0?clampScoreFont(initial*distance/initialDistance):clampScoreFont(initial);}

function followTarget(row,viewportBottom){
 const height=Math.max(1,viewportBottom),topLimit=Math.min(56,height*.15),bottomLimit=height*.72;
 if(row.top<topLimit||row.bottom>bottomLimit)return Math.round(row.top-height*.28);
 return 0;
}

 return Object.freeze({clampScoreFont,touchDistance,touchCenter,pinchFont,followTarget});
});
