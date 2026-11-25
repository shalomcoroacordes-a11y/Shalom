"use strict";
module.exports={
 forbidden:[
  {name:"no-local-cycles",severity:"warn",from:{pathNot:"(^|/)node_modules/"},to:{circular:true}},
  {name:"public-app-does-not-import-admin",severity:"warn",from:{path:"^mobile/"},to:{path:"^admin-mobile/"}},
  {name:"admin-app-does-not-import-public",severity:"warn",from:{path:"^admin-mobile/"},to:{path:"^mobile/"}},
  {name:"production-does-not-import-tests",severity:"warn",from:{pathNot:"(^|/)(tests|__tests__)/"},to:{path:"(^|/)(tests|__tests__)/"}}
 ],
 options:{doNotFollow:{path:"(^|/)node_modules/|(^|/)studio-bundle\\.js$"},exclude:{path:"(^|/)\\.git/"}}
};
