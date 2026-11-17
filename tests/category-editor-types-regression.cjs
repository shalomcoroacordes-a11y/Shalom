// Static regression for category editor types, matching the production CHECK constraint.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "..", "admin-category-browser-v2.js"), "utf8");

assert.match(source, /<option value="">General<\/option>|<option value="" \$\{[^\n]+>General<\/option>/);
assert.match(source, /<option value="catolico"/);
assert.match(source, /<option value="cristiano"/);
assert.doesNotMatch(source, /<option value="mixto"/, "Mixto cannot be saved by the live categories CHECK constraint");
assert.doesNotMatch(source, /mixto: "Mixto"/, "Do not advertise an unsupported category type");
assert.doesNotMatch(source, /"catolico", "cristiano", "mixto", "general"/);
console.log("OK: admin category editor offers only database-supported types.");
