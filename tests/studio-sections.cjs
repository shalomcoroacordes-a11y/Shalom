"use strict";
const assert=require("node:assert/strict"),C=require("../studio-core"),codec=require("../studio-codec"),collections=require("../studio-collections");
const a=C.anchorsFromRows([{kind:"section",text:"Coro"},{kind:"chords",chordLine:"C G"},{kind:"section",text:"Verso"},{kind:"chords",chordLine:"Am F"}]);
let cfg=C.draft(a,"4/4",80,2);
const h=Array.from({length:8},(_,i)=>({hit:i%2?"up":"down",accent:i===0}));
cfg=C.setSection(cfg,0,{bpm:60,hits:h});cfg=C.setSection(cfg,2,{bpm:120,transition:"pause",pauseMs:1000});
let t=C.compile(a,cfg);assert.equal(t[0].duration,.5);assert.equal(t[1].hit,"up");assert.equal(t[4].duration,.25);assert.equal(t[4].gapBefore,1);assert.equal(t[4].time,3);
assert.deepEqual(C.compile(a,codec.decode(a,codec.encode(a,cfg))),t);
let clock=C.clockRange(t,0,8);assert.equal(clock.duration,4);assert.deepEqual(clock.offsets,[0,.5,1,1.5,3,3.25,3.5,3.75]);assert.equal(C.clockIndex(clock.offsets,3.3),5);
assert.equal(C.clockRange(t,4,8).duration,1);
const sequence=collections.scheduleTracks([{timeline:t,config:cfg,gapMs:500},{timeline:t,config:cfg,gapMs:0}]);assert.equal(sequence.duration,8.5);assert.ok(sequence.events.some(e=>e.release&&e.time===2));assert.equal(sequence.windows[1].start,4.5);
cfg=C.setSection(cfg,2,{transition:"gradual",pauseMs:0});t=C.compile(a,cfg);assert.equal(t[4].tempo,60);assert.equal(t[7].tempo,120);assert.ok(t[5].tempo>60&&t[5].tempo<120);
cfg=C.setDuration(cfg,0,4);t=C.compile(a,cfg);assert.equal(t[cfg.changes[2].step].tempo,60);
assert.throws(()=>C.setSection(cfg,2,{bpm:400}),/Tempo/);

const original=JSON.stringify(cfg.changes),copy=C.setSection(cfg,2,{...C.sectionConfig(cfg,0),index:2});assert.equal(JSON.stringify(copy.changes),original);assert.equal(copy.sections[1].bpm,60);assert.deepEqual(copy.sections[1].hits,copy.sections[0].hits);assert.ok(copy.sections[1].hits!==copy.sections[0].hits);
