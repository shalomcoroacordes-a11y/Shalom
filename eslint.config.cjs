"use strict";
const readonly=names=>Object.fromEntries(names.split(/\s+/).filter(Boolean).map(name=>[name,"readonly"]));
const nativeGlobals=readonly("console process global __DEV__ fetch setTimeout clearTimeout setInterval clearInterval URL URLSearchParams AbortController AbortSignal Blob File FormData Headers Request Response TextEncoder TextDecoder queueMicrotask atob btoa navigator performance requestAnimationFrame cancelAnimationFrame XMLHttpRequest WebSocket");
const defectRules={
 "no-dupe-keys":"warn","no-dupe-args":"warn","no-duplicate-case":"warn",
 "no-unreachable":"warn","no-unsafe-finally":"warn","no-self-assign":"warn",
 "no-sparse-arrays":"warn","no-debugger":"warn","no-constant-condition":["warn",{checkLoops:false}],
 "no-async-promise-executor":"warn","no-promise-executor-return":"warn",
 "no-unsafe-optional-chaining":"warn","valid-typeof":"warn"
};
module.exports=[
 {ignores:["**/node_modules/**","**/studio-bundle.js","**/*.min.js","**/dist/**","**/build/**","**/android/**","**/ios/**","**/.expo/**"]},
 {files:["*.js"],languageOptions:{ecmaVersion:"latest",sourceType:"script"},
  rules:{...defectRules,"no-unused-vars":["warn",{vars:"local",args:"none",caughtErrors:"none"}]}},
 {files:["mobile/App.js","mobile/src/**/*.js","admin-mobile/App.js","admin-mobile/src/**/*.js"],
  languageOptions:{ecmaVersion:"latest",sourceType:"commonjs",globals:nativeGlobals},
  rules:{...defectRules,"no-undef":"warn","no-unused-vars":["warn",{args:"none",caughtErrors:"none"}]}}
];
