"use strict";
const assert=require("node:assert/strict");
const {recoveryFormat}=require("../src/trash-format");
const base={item_type:"song",original_id:"s",id:"t"};
const cases=[
 [{song:{id:"s"},song_versions:[]},"native"],
 [{record:{id:"s"},relations:{}},"web"],
 [{song:{id:"other"}},"invalid"],
 [{record:{id:"other"}},"invalid"],
 [{song:{id:"s"},record:{id:"s"}},"invalid"],
 [{song:null},"invalid"],[null,"invalid"],[[],"invalid"],[{},"invalid"],[{id:"s"},"invalid"]
];
for(const [snapshot,expected] of cases)assert.equal(recoveryFormat({...base,snapshot}),expected);
assert.equal(recoveryFormat({...base,item_type:"artist",snapshot:{song:{id:"s"}}}),"invalid");
assert.equal(recoveryFormat({...base,original_id:null,snapshot:{song:{id:"s"}}}),"invalid");
console.log("Trash: native, web and invalid snapshots distinguished without mutation.");
