"use strict";
// A token belongs to one login, not merely one account ID. Logout and same-account
// reauthentication invalidate all outstanding UI operations immediately.
function createSessionScope(){
 let token=Object.freeze({owner:null});
 function begin(owner=null){token=Object.freeze({owner});return token;}
 function current(){return token;}
 function matches(candidate,owner){return !!owner&&candidate===token&&candidate.owner===owner;}
 return Object.freeze({begin,current,matches});
}
module.exports={createSessionScope};
