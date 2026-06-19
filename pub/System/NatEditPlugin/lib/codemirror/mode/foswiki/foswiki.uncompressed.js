// read https://codemirror.net/doc/manual.html#modeapi
/*global CodeMirror */
'use strict';

(function(CodeMirror) {

  var italicRegExp     = /\_(?:\S+|(?:\S.*?\S))\_(?=$|[\s,.;:!?\)])/,
      boldRegExp       = /\*(?:\S+|(?:\S.*?\S))\*(?=$|[\s,.;:!?\)])/,
      boldItalicRegExp = /__(?:\S+|(?:\S.*?\S))__(?=$|[\s,.;:!?\)])/,
      monoRegExp       = /\=(?:\S+|(?:\S.*?\S))\=(?=$|[\s,.;:!?\)])/,
      boldMonoRegExp   = /\=\=(?:\S+|(?:\S.*?\S))\=\=(?=$|[\s,.;:!?\)])/,
      colorTagRegExp   = /(AQUA|BLACK|BLUE|BROWN|GRAY|GREEN|LIME|MAROON|NAVY|OLIVE|ORANGE|PINK|PURPLE|RED|SILVER|TEAL|WHITE|YELLOW)/,

      headingsRegExp = /^\-\-\-+(\++|\#+)(?:!!)?(?=\s)/,
      hrRegExp = /\-\-\-+\s*$/,
      tmplDefExp = /%TMPL:DEF{"(.*?)"}%/,
      tmplEndExp = /%TMPL:END%/,
      tmplIncludeExp = /%TMPL:INCLUDE{"(.*?)"}%/,

      startVerbatimExp = /^\s*<verbatim[^>]*?>/,
      stopVerbatimExp = /^\s*<\/verbatim>/,

      startIncludeExp = /^\s*%(STARTINCLUDE|STARTSECTION{(.*?)})%/,
      stopIncludeExp = /%(STOPINCLUDE|ENDSECTION{(.*?)})%/,

      squareBracketRegExp = /\[\[(.+?)(?:\]\[(.+?))?\]\]/,

      webNameBase = 
         "[" + foswiki.RE.upper + "]+" + 
         "[" + foswiki.RE.alnum + "_]*",

      webNameRegExp = new RegExp(
         webNameBase +
         "(?:(?:[\.\/]" + webNameBase + ")+)*"
      ),

      wikiWordRegExp = new RegExp(
        "[" + foswiki.RE.upper + "]+" +
        "[" + foswiki.RE.lower + foswiki.RE.digit + "]+" +
        "[" + foswiki.RE.upper + "]+" +
        "[" + foswiki.RE.alnum + "]*"
      ),

      webDotWikiWordRegExp = new RegExp(
        "(?:" + webNameBase + "\\.)*" +
        "[" + foswiki.RE.upper + "]+" +
        "[" + foswiki.RE.lower + foswiki.RE.digit + "]+" +
        "[" + foswiki.RE.upper + "]+" +
        "[" + foswiki.RE.alnum + "]*"
      ),

      noAutolink = foswiki.getPreference("NatEditPlugin").NoAutolink,

      externalLinkRegExp = /(?:file|ftp|gopher|https|http|irc|mailto|news|nntp|sip|tel|skype|telnet):(?:[^\s<>"]+[^\s*.,!?;:\)<|])/,

      listRegExp = /(\*|(?:[1AaIi]\.)|(?:\d+\.?)|:)(?= )/,
      listIndentRegExp = /^((?:\t| {3})+)(\*|(?:[1AaIi]\.)|(?:\d+\.?)|:)(\s*)(.*)$/,

      simpleMacroRegExp = /\%([A-Za-z\d\:_]+)(?:\{\s*\})?\%/,
      macroStartRegExp = /\%([A-Za-z\d:_]+){/,
      macroEndRegExp = /\}\%/,
      macroCommentRegExp = /%{|}%/,

      verbatimStartRegExp = /<verbatim[^>]*>/,
      verbatimEndRegExp = /<\/verbatim>/,

      noAutolinkStartRegExp = /<noautolink>/,
      noAutolinkEndRegExp = /<\/noautolink>/,

      colorCodeRegExp = /(#[0-9a-fA-F]{6})/;

  CodeMirror.defineMode("foswiki", function(config, parserConfig) {
    var htmlMode = CodeMirror.getMode(config, "htmlmixed");

    function tokenInline(stream, state) {
      var prevChar = stream.prev(), match, style, pos, macro, tmp;

      // verbatim
      if ((match = stream.match(verbatimStartRegExp, 0))) {
        stream.pos -= match[0].length;
        state.insideVerbatim = 1;
      }
      if (state.insideVerbatim === 1) {
        if ((match = stream.match(verbatimEndRegExp, 0))) {
          stream.pos -= match[0].length;
          state.insideVerbatim = 2;
        }
      }

      // noautolink
      if ((match = stream.match(noAutolinkStartRegExp, 0))) {
        stream.pos -= match[0].length;
        state.insideNoAutolink = true;
      } else if (state.insideNoAutolink) {
        if ((match = stream.match(noAutolinkEndRegExp, 0))) {
          stream.pos -= match[0].length;
          state.insideNoAutolink = false;
        }
      }

      // square brackets
      if (stream.match(squareBracketRegExp, 1)) {
        return "link";
      } 

      // external links
      if (stream.match(externalLinkRegExp, 1)) {
        return "link";
      } 

      // TML 
      if (prevChar === undefined || prevChar.match(/\s|\(/)) { // simulate look behind
        // bold italic
        if (stream.match(boldItalicRegExp, 1)) {
          return "strong em";
        } 

        // italic
        if (stream.match(italicRegExp, 1)) {
          return "em";
        } 

        // bold
        if (stream.match(boldRegExp, 1)) {
          return "strong";
        } 

        // bold mono 
        if (stream.match(boldMonoRegExp, 1)) {
          return "strong mono";
        }

        // mono 
        if (stream.match(monoRegExp, 1)) {
          return "mono";
        }

        if (!noAutolink && !state.insideNoAutolink) {
          // WikiWord
          if (stream.match(webDotWikiWordRegExp, 1)) {
            return "link";
          }
        }
      } 

      // macro w/o attributes
      if ((match = stream.match(simpleMacroRegExp, 1))) {
        style = "tag";

        macro = match[1];

        if ((match = macro.match(colorTagRegExp))) {
          tmp = macro.toLowerCase();
          state.colorTags.push(tmp);
          style += " color-" + tmp;

        } else if (macro === 'ENDCOLOR') {
          tmp = state.colorTags.pop();
        }

        if (tmp) {
          style += " color-" + tmp;
        }
          
        return style;
      }

      // macros start
      if ((match = stream.match(macroStartRegExp, 1))) {
        state.macroName = match[1];
        return "tag";
      }

      // macro end
      if (state.macroName) {
        if (stream.match(macroEndRegExp, 1)) {
          state.macroName = undefined;
          return "tag";
        } 

        // TODO: tokenize macro params
        if ((match = stream.match(/(["'])/, 1))) {
          state.tokenize = tokenString(match[1]);
          return state.tokenize(stream, state);
        }
      }

      // color
      if ((match = stream.match(colorCodeRegExp, 1))) {
        return "atom color";
      }

      if (stream.match(macroCommentRegExp, 1)) {
        return "comment";
      }

      pos = stream.pos; // remember pos before tokenizing further 
      style = style || '';
      style += tokenHtml(stream, state) || '';

      if (!style) {
        stream.pos = pos+1; // rewind til here as there was no html
      }

      if (state.colorTags.length) {
        style += " color-" + state.colorTags[state.colorTags.length -1];
      }

      //console.log("style=",style);
      return style?style:undefined;
    }

    function tokenBase(stream, state) {
      var match, style, styles = [];

      // things at the line start
      if (stream.sol()) {
        // headings
        if ((match = stream.match(headingsRegExp, 1))) {
          state.headingLevel = match[1].length;
        }

        // horizontal rulers
        else if (stream.match(hrRegExp, 1)) {
          stream.skipToEnd();
          styles.push("line-cm-hr");
        }

      } 

      // lists
      if (state.indented) {
        if (state.indented % 3 === 0 && stream.pos === state.indented && stream.match(listRegExp, 1)) {
          state.insideList = 1;
          styles.push("atom bullet");
        }
      }

      style = tokenInline(stream, state);

      if (style) {
        styles.push(style);
      }

      if (state.insideVerbatim) {
        styles.push("line-background-cm-verbatim");
        if (state.insideVerbatim > 1) {
          state.insideVerbatim = 0;
        }
      }

      if (state.headingLevel) {
        styles.push("line-cm-header line-cm-h"+state.headingLevel);
        state.headingLevel = 0;
      }

      return styles.length?styles.join(" "):null;
    }

    function tokenString(delimiter) {
      return function(stream, state) {

        while (!stream.eol()) {
          stream.eatWhile(/[^'"\/\\]/);

          if (stream.eat("\\")) {
            stream.next();
          } else if (stream.match(delimiter)) {
            state.tokenize = tokenBase;
            return "string";
          } else {
            stream.eat(/['"\/]/);
          }
        }

        return "string";
      };
    }

    function tokenHtml(stream, state) {
      return htmlMode.token(stream, state.htmlState);
    }

    return {
      startState: function() {
        var state = htmlMode.startState();

        return {
          tokenize: tokenBase,
          indented: 0, 
          headingLevel: 0,
          insideVerbatim: 0,
          insideList: 0, 
          insideNoAutolink: false,
          macroName: undefined,
          colorTags: [],
          htmlState: state
        };
      },
      copyState: function(state) {
        return {
          tokenize: state.tokenize, 
          indented: state.indented,
          headingLevel: state.headingLevel,
          insideVerbatim: state.insideVerbatim,
          insideList: state.insideList,
          insideNoAutolink: state.insideNoAutolink,
          macroName: state.macroName,
          colorTags: state.colorTags.slice(),
          htmlState: CodeMirror.copyState(htmlMode, state.htmlState)
        };
      },
      token: function(stream, state) {
        if (stream.sol()) {
          state.indented = stream.indentation();
        }
        if (stream.eatSpace()) {
          return null;
        }

        return state.tokenize(stream, state);
      }
    };
  }, "htmlmixed");

  CodeMirror.defineMIME("text/x-foswiki", "foswiki");

  // return the previous char
  CodeMirror.StringStream.prototype.prev = function() {
    return this.pos > 0 ? this.string.charAt(this.pos - 1) : undefined;
  };


  // support foswiki tml folding
  CodeMirror.registerHelper("fold", "foswiki", function(cm, start) {
    var section = _getTmplFold(cm, start);

    if (section && section.from === undefined) {
      return;
    }

    return section 
      /*|| _getVerbatimFold(cm, start) */
      /*|| _getSectionFold(cm, start) */
      || _getHeaderFold(cm, start);
  });

  function _getTmplFold(cm, start) {
    var firstLine = cm.getLine(start.line),
        lineNo;

    if (tmplIncludeExp.test(firstLine) || (tmplDefExp.test(firstLine) && tmplEndExp.test(firstLine))) {
      return {};
    }

    if (tmplDefExp.test(firstLine)) {

      const lastLineNo = cm.lastLine();

      lineNo = start.line + 1;
      while (lineNo < lastLineNo) {
        if (tmplEndExp.test(cm.getLine(lineNo))) {
          break;
        }
        lineNo++;
      }

      let lastLine = cm.getLine(lineNo) || cm.getLine(lastLineNo);

      return {
        from: CodeMirror.Pos(start.line, firstLine.length),
        to: CodeMirror.Pos(lineNo, lastLine.length)
      };
    }
  }

  function _getVerbatimFold(cm, start) {
    var firstLine = cm.getLine(start.line),
        lineNo;

    if (startVerbatimExp.test(firstLine)) {

      const lastLineNo = cm.lastLine();

      lineNo = start.line + 1;
      while (lineNo < lastLineNo) {
        if (stopVerbatimExp.test(cm.getLine(lineNo))) {
          break;
        }
        lineNo++;
      }

      let lastLine = cm.getLine(lineNo) || cm.getLine(lastLineNo);

      return {
        from: CodeMirror.Pos(start.line, firstLine.length),
        to: CodeMirror.Pos(lineNo, lastLine.length)
      };
    }
  }

  function _getSectionFold(cm, start) {
    var firstLine = cm.getLine(start.line),
        lineNo;

    if (startIncludeExp.test(firstLine) && !stopIncludeExp.test(firstLine)) {

      const lastLineNo = cm.lastLine();

      lineNo = start.line + 1;
      while (lineNo < lastLineNo) {
        if (stopIncludeExp.test(cm.getLine(lineNo))) {
          break;
        }
        lineNo++;
      }

      let lastLine = cm.getLine(lineNo) || cm.getLine(lastLineNo);

      return {
        from: CodeMirror.Pos(start.line, firstLine.length),
        to: CodeMirror.Pos(lineNo, lastLine.length)
      };
    }
  }

  function _getHeaderFold(cm, start) {
    var firstLine = cm.getLine(start.line),
      firstLevel = _headerLevel(firstLine),
      level, lineNo;

    if (firstLevel === undefined) {
      return;
    }

    const lastLineNo = cm.lastLine();

    lineNo = start.line + 1;
    while (lineNo < lastLineNo) {
      level = _headerLevel(cm.getLine(lineNo));
      if (level !== undefined && firstLevel >= level) {
        break;
      }
      lineNo++;
    }

    if (level !== undefined) {
      lineNo--;
    }

    let lastLine = cm.getLine(lineNo) || cm.getLine(lastLineNo);

    return {
      from: CodeMirror.Pos(start.line, firstLine.length),
      to: CodeMirror.Pos(lineNo, lastLine.length)
    };
  }

  function _headerLevel(line) {
    var match = line.match(headingsRegExp);

    if (match) {
      return match[1].length;
    }

    return;
  }

  var _foldStatus = "unfold";
  CodeMirror.commands.toggleFoldAll = function(cm) {
    _foldStatus = _foldStatus === "unfold" ? "fold" : "unfold";
    cm.operation(function() {
      for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++)
        cm.foldCode(CodeMirror.Pos(i, 0), { scanUp: false }, _foldStatus);
    });
  };

  CodeMirror.commands.newlineAndIndentContinueFoswikiList = function(cm) {
    var ranges, replacements = [];

    if (cm.getOption("disableInput")) {
      return CodeMirror.Pass;
    }

    ranges = cm.listSelections();

    for (var i = 0; i < ranges.length; i++) {
      var pos = ranges[i].head,
          eolState = cm.getStateAfter(pos.line),
          inList = eolState.insideList,
          line = cm.getLine(pos.line),
          match = listIndentRegExp.exec(line),
          cursorBeforeBullet = /^(\s*)$/.test(line.slice(0, pos.ch));

      //console.log("line=",line,"match=",match,"ranges[i]=",ranges[i],"inList=",inList);
      if (inList && cursorBeforeBullet) {
        replacements[i] = "\n" + RegExp.$1;
      } else if (!ranges[i].empty() || !inList || !match) {
        cm.execCommand("newlineAndIndent");
        return;
      } else if (!match[4]) {
        cm.replaceRange("", {
          line: pos.line, ch: 0
        }, {
          line: pos.line, ch: pos.ch + 1
        });
        replacements[i] = "";
      } else {
        replacements[i] = "\n" + match[1] + match[2] + match[3];
      }
    }

    cm.replaceSelections(replacements);
  };

  CodeMirror.commands.newlineAndContinueList = function(cm) {
    var ranges, replacements = [];

    if (cm.getOption("disableInput")) {
      return CodeMirror.Pass;
    }

    ranges = cm.listSelections();

    for (var i = 0; i < ranges.length; i++) {
      var pos = ranges[i].head,
          eolState = cm.getStateAfter(pos.line),
          inList = eolState.insideList,
          line = cm.getLine(pos.line),
          match = listIndentRegExp.exec(line),
          cursorBeforeBullet = /^(\s*)$/.test(line.slice(0, pos.ch));

      //console.log("line=",line,"match=",match,"ranges[i]=",ranges[i],"inList=",inList);
      if (inList && cursorBeforeBullet) {
        replacements[i] = "\n" + RegExp.$1;
      } else if (!ranges[i].empty() || !inList || !match) {
        replacements[i] = "\n";
      } else if (!match[4]) {
        cm.replaceRange("", {
          line: pos.line, ch: 0
        }, {
          line: pos.line, ch: pos.ch + 1
        });
        replacements[i] = "";
      } else {
        replacements[i] = "\n" + match[1] + " " + match[3];
      }
    }

    cm.replaceSelections(replacements);
  };

})(CodeMirror);
