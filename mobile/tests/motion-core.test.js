const assert=require("node:assert/strict");
const {motion,navGeometry}=require("../src/motion-core");
assert.equal(motion.page,240);assert.equal(motion.nav,340);assert.equal(motion.pressScale,.94);
assert.equal(motion.heartUp+motion.heartDown,320);
assert.equal(navGeometry(0,5,0),null);assert.equal(navGeometry(360,5,-1),null);
for(const width of [320,360,420,768]){
 const first=navGeometry(width,5,0),last=navGeometry(width,5,4);
 assert.ok(first.x>=4);assert.ok(last.x+last.width<=width-4);
 assert.ok(Math.abs(last.x-first.x-(width-8)*4/5)<1e-8);
}
assert.ok(navGeometry(180,5,0).width<46);
console.log("Motion timing and responsive indicator geometry verified.");
