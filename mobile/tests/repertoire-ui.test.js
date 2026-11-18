const assert=require("node:assert/strict");
const {repertoireType,filterRepertoires}=require("../src/repertoire-ui");
const rows=[
 {id:"m1",kind:"misa",title:"Misa dominical",items:[{},{}]},
 {id:"e1",kind:"ensayo",title:"Ensayo general",items:[{}]},
 {id:"o1",kind:"evento",title:"Visita especial",items:[]},
 {id:"m2",kind:"misa",title:"Misa de Navidad",items:[{}]}
];
assert.equal(repertoireType(rows[0]),"misa");
assert.equal(repertoireType(rows[1]),"ensayo");
assert.equal(repertoireType(rows[2]),"otras");
assert.equal(repertoireType({kind:"Práctica"}),"ensayo");
assert.deepEqual(filterRepertoires(rows).map(x=>x.id),["m1","e1","o1","m2"]);
assert.deepEqual(filterRepertoires(rows,"misa").map(x=>x.id),["m1","m2"]);
assert.deepEqual(filterRepertoires(rows,"ensayo").map(x=>x.id),["e1"]);
assert.deepEqual(filterRepertoires(rows,"otras").map(x=>x.id),["o1"]);
assert.deepEqual(filterRepertoires(rows,"todos","navidad").map(x=>x.id),["m2"]);
assert.deepEqual(filterRepertoires(rows,"todos","MISÁ").map(x=>x.id),["m1","m2"]);
assert.deepEqual(filterRepertoires([], "otras"),[]);
assert.equal(rows[0].items.length,2,"Never invent a repertoire song count");
console.log("SHALOM repertoire filters preserve real records and song counts.");
