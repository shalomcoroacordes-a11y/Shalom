const assert=require("node:assert/strict");
const fs=require("node:fs");
const app=fs.readFileSync("mobile/App.js","utf8");
const styles=fs.readFileSync("mobile/src/app-styles.js","utf8");
const generator=fs.readFileSync("mobile/scripts/generate_icons.py","utf8");
const dove=fs.readFileSync("mobile/assets/dove-path.txt","utf8").trim();
assert.ok(dove.startsWith("M "), "Official dove outline must remain available");

// The official olive-branch dove is used in ALL mobile headers and launcher art.
const start=generator.indexOf('home_logo = f"""');
const end=generator.indexOf('render_ui(home_logo,',start);
assert.ok(start>=0&&end>start,"Home brand asset must be generated");
const logo=generator.slice(start,end);
assert.equal((logo.match(/<path /g)||[]).length,1,"Dove must contain one original vector path");
assert.match(logo,/d="\{path\}"/,"Use the same dove outline as app launcher");
assert.doesNotMatch(logo,/stroke=|<line|M540 194|M505 353|music.note/i,
 "Do not redraw the unwanted green underline, note or ornaments");
assert.match(generator,/render\(icon, "icon\.png"\)/);
assert.match(generator,/render\(adaptive, "adaptive-foreground\.png"\)/);
assert.match(app,/source:HOME_IMAGES\.logo/);
assert.doesNotMatch(app,/HOME_IMAGES\.waves/,"Do not add decorative lines behind dove");

// Tone changes are immediate local state updates; do not open a dialog.
assert.match(app,/function adjustTone\(step\)\{setTranspose\(v=>Math\.max\(-11,Math\.min\(11,v\+step\)\)\);\}/);
assert.match(app,/function renderToneStepper\(text\)/);
assert.match(app,/accessibilityLabel:"Bajar un semitono"/);
assert.match(app,/accessibilityLabel:"Subir un semitono"/);
assert.match(app,/disabled:transpose<=-11/);
assert.match(app,/disabled:transpose>=11/);
assert.match(app,/renderToneStepper\("Tono "\+toned\)/,"Cantos must have direct semitone controls");
assert.match(app,/renderToneStepper\(transpose===0\?"Original"/,
 "Popurris and Repertorios must use the same tone controls");
assert.match(app,/renderToneStepper\("Tono "\+toned\)/,"Song reader provides direct tone buttons");
assert.match(app,/renderToneStepper\(transpose===0\?"Original"/,"Multi-song reader provides direct tone buttons");
assert.doesNotMatch(app,/style:S\.songActionBar/,"No duplicate toolbar obscures lyrics");
assert.doesNotMatch(app,/showSongToneMenu/);
assert.match(app,/setReaderFont\(v=>Math\.max\(13,v-1\)\)/);
assert.match(app,/setReaderFont\(v=>Math\.min\(22,v\+1\)\)/);

// Sizing checks: denser than the old 104dp cards without losing tap targets.
assert.match(styles,/repCard:\{minHeight:78/);
assert.match(styles,/repCardIconWrap:\{height:50,width:50/);
assert.match(styles,/repFilterChip:\{minHeight:44/);
assert.match(styles,/songToneStepButton:\{width:40,minHeight:44/);
assert.match(styles,/songFontButton:\{flex:1,alignItems:"center",justifyContent:"center",minHeight:44/);
assert.doesNotMatch(styles,/songActionBar:/,"Dead reader footer styles are removed");
console.log("SHALOM 0.3.7: quick tone controls, compact cards and original standalone dove verified.");
