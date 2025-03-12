"use strict";!function(e){var i=/\_(?:\S+|(?:\S.*?\S))\_(?=$|[\s,.;:!?\)])/,t=/\*(?:\S+|(?:\S.*?\S))\*(?=$|[\s,.;:!?\)])/,n=/__(?:\S+|(?:\S.*?\S))__(?=$|[\s,.;:!?\)])/,o=/\=(?:\S+|(?:\S.*?\S))\=(?=$|[\s,.;:!?\)])/,r=/\=\=(?:\S+|(?:\S.*?\S))\=\=(?=$|[\s,.;:!?\)])/,a=/(AQUA|BLACK|BLUE|BROWN|GRAY|GREEN|LIME|MAROON|NAVY|OLIVE|ORANGE|PINK|PURPLE|RED|SILVER|TEAL|WHITE|YELLOW)/,s=/\-\-\-+(\++|\#+)(?:!!)?(?=\s)/,l=/\-\-\-+\s*$/,c=/\[\[(.+?)(?:\]\[(.+?))?\]\]/,m="["+foswiki.RE.upper+"]+["+foswiki.RE.alnum+"_]*",d=(new RegExp(m+"(?:(?:[./]"+m+")+)*"),new RegExp("["+foswiki.RE.upper+"]+["+foswiki.RE.lower+foswiki.RE.digit+"]+["+foswiki.RE.upper+"]+["+foswiki.RE.alnum+"]*"),new RegExp("(?:"+m+"\\.)*["+foswiki.RE.upper+"]+["+foswiki.RE.lower+foswiki.RE.digit+"]+["+foswiki.RE.upper+"]+["+foswiki.RE.alnum+"]*")),u=foswiki.getPreference("NatEditPlugin").NoAutolink,h=/(?:file|ftp|gopher|https|http|irc|mailto|news|nntp|sip|tel|skype|telnet):(?:[^\s<>"]+[^\s*.,!?;:\)<|])/,f=/(\*|(?:[1AaIi]\.)|(?:\d+\.?)|:)(?= )/,g=/^((?:\t| {3})+)(\*|(?:[1AaIi]\.)|(?:\d+\.?)|:)(\s*)(.*)$/,p=/\%([A-Za-z\d\:]+)(?:\{\s*\})?\%/,k=/\%([A-Za-z\d:]+){/,E=/\}\%/,v=/%{|}%/,S=/<verbatim[^>]*>/,w=/<\/verbatim>/,A=/<noautolink>/,L=/<\/noautolink>/,R=/(#[0-9a-fA-F]{6})/;e.defineMode("foswiki",(function(m,g){var N=e.getMode(m,"htmlmixed");function b(e,s){var l,m,f,g,b,I,T=e.prev();if((l=e.match(S,0))&&(e.pos-=l[0].length,s.insideVerbatim=1),1===s.insideVerbatim&&(l=e.match(w,0))&&(e.pos-=l[0].length,s.insideVerbatim=2),(l=e.match(A,0))?(e.pos-=l[0].length,s.insideNoAutolink=!0):s.insideNoAutolink&&(l=e.match(L,0))&&(e.pos-=l[0].length,s.insideNoAutolink=!1),e.match(c,1))return"link";if(e.match(h,1))return"link";if(void 0===T||T.match(/\s|\(/)){if(e.match(n,1))return"strong em";if(e.match(i,1))return"em";if(e.match(t,1))return"strong";if(e.match(r,1))return"strong mono";if(e.match(o,1))return"mono";if(!u&&!s.insideNoAutolink&&e.match(d,1))return"link"}if(l=e.match(p,1))return m="tag",(l=(g=l[1]).match(a))?(b=g.toLowerCase(),s.colorTags.push(b),m+=" color-"+b):"ENDCOLOR"===g&&(b=s.colorTags.pop()),b&&(m+=" color-"+b),m;if(l=e.match(k,1))return s.macroName=l[1],"tag";if(s.macroName){if(e.match(E,1))return s.macroName=void 0,"tag";if(l=e.match(/(["'])/,1))return s.tokenize=(I=l[1],function(e,i){for(;!e.eol();)if(e.eatWhile(/[^'"\/\\]/),e.eat("\\"))e.next();else{if(e.match(I))return i.tokenize=V,"string";e.eat(/['"\/]/)}return"string"}),s.tokenize(e,s)}return(l=e.match(R,1))?"atom color":e.match(v,1)?"comment":(f=e.pos,m=m||"",m+=function(e,i){return N.token(e,i.htmlState)}(e,s)||"",m||(e.pos=f+1),s.colorTags.length&&(m+=" color-"+s.colorTags[s.colorTags.length-1]),m||void 0)}function V(e,i){var t,n,o=[];return e.sol()&&((t=e.match(s,1))?i.headingLevel=t[1].length:e.match(l,1)&&(e.skipToEnd(),o.push("line-cm-hr"))),i.indented&&i.indented%3==0&&e.pos===i.indented&&e.match(f,1)&&o.push("atom bullet"),(n=b(e,i))&&o.push(n),i.insideVerbatim&&(o.push("line-background-cm-verbatim"),i.insideVerbatim>1&&(i.insideVerbatim=0)),i.headingLevel&&(o.push("line-cm-header line-cm-h"+i.headingLevel),i.headingLevel=0),o.length?o.join(" "):null}return{startState:function(){return{tokenize:V,indented:0,headingLevel:0,insideVerbatim:0,insideNoAutolink:!1,macroName:void 0,colorTags:[],htmlState:N.startState()}},copyState:function(i){return{tokenize:i.tokenize,indented:i.indented,headingLevel:i.headingLevel,insideVerbatim:i.insideVerbatim,insideNoAutolink:i.insideNoAutolink,macroName:i.macroName,colorTags:i.colorTags.slice(),htmlState:e.copyState(N,i.htmlState)}},token:function(e,i){return e.sol()&&(i.indented=e.indentation()),e.eatSpace()?null:i.tokenize(e,i)}}}),"htmlmixed"),e.defineMIME("text/x-foswiki","foswiki"),e.StringStream.prototype.prev=function(){return this.pos>0?this.string.charAt(this.pos-1):void 0},e.registerHelper("fold","foswiki",(function(i,t){var n,o,r,a,l,c;function m(e){var i=e.match(s);if(i)return i[1].length}if(void 0===(a=m(n=i.getLine(t.line)))){if(0!==t.line||/^\s*$/.test(n))return;a=2}for(r=i.lastLine(),c=t.line+1;c<r&&!(void 0!==(l=m(i.getLine(c)))&&a>=l);)c++;return void 0!==l&&c--,o=i.getLine(c)||i.getLine(r),{from:e.Pos(t.line,n.length),to:e.Pos(c,o.length)}})),e.commands.newlineAndIndentContinueFoswikiList=function(i){var t,n=[];if(i.getOption("disableInput"))return e.Pass;t=i.listSelections();for(var o=0;o<t.length;o++){var r=t[o].head,a=!1!==i.getStateAfter(r.line).list,s=i.getLine(r.line),l=g.exec(s);if(!t[o].empty()||!a||!l)return void i.execCommand("newlineAndIndent");l[4]?n[o]="\n"+l[1]+l[2]+l[3]:(i.replaceRange("",{line:r.line,ch:0},{line:r.line,ch:r.ch+1}),n[o]="")}i.replaceSelections(n)}}(CodeMirror);
