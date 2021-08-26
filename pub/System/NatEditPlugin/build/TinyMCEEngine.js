"use strict";!function(t){function e(i,o){var r=this,n=foswiki.getScriptUrlPath("view",foswiki.getPreference("USERSWEB"),foswiki.getPreference("WIKINAME"));foswiki.getPreference("PUBURLPATH");r.shell=i,r.opts=t.extend({},e.defaults,r.shell.opts.tinymce,o),r.opts.tinymce.selector="#"+r.shell.id+" textarea",r.opts.natedit.signatureMarkup=["-- ",'<a href="'+n+'">'+foswiki.getPreference("WIKINAME")+"</a>"," - "+foswiki.getPreference("SERVERTIME")],r.opts.tinymce.content_css=foswiki.getPreference("NatEditPlugin").ContentCSS,t.extend(r.shell.opts,r.opts.natedit)}e.prototype=Object.create(BaseEngine.prototype),e.prototype.constructor=e,e.prototype.parent=BaseEngine.prototype,e.prototype.init=function(){var e=this,i=foswiki.getPreference("PUBURLPATH")+"/"+foswiki.getPreference("SYSTEMWEB")+"/NatEditPlugin/lib/tinymce",o=t.Deferred();return t.when(e.parent.init(),e.shell.getScript(i+"/tinymce.min.js")).done((function(){tinymce.PluginManager.add("natedit-image",(function(t){t.ui.registry.addMenuItem("image",{icon:"image",text:"Image ...",onAction:function(){var t={web:foswiki.getPreference("WEB"),topic:foswiki.getPreference("TOPIC"),selection:""};e.shell.dialog({name:"insertimage",open:function(i){e.shell.initImageDialog(i,t)},data:t}).then((function(i){e.shell.handleInsertImage(dialogElem,t)}))}}),t.ui.registry.addContextMenu("image",{update:function(t){return"IMG"===t.nodeName?"image":""}})})),e.opts.tinymce.init_instance_callback=function(i){e.editor=i,e.opts.debug&&(window.editor=i),e.tml2html(t(e.shell.txtarea).val()).done((function(i){e.editor.setContent(i),e.editor.undoManager.clear(),t(window).trigger("resize"),o.resolve(e)})).fail((function(){o.reject(),e.shell.showMessage("error","Error calling tml2html")})),window.darMode,window.darkMode.isActive&&(console.log("propagating darkmode to iframe"),e.getWrapperElement().contents().find("html:first").attr("data-theme","dark"))},tinymce.init(e.opts.tinymce)})).fail((function(){o.reject(),alert("failed to load tinymce.js")})),o.promise()},e.prototype.beforeSubmit=function(e){var i=this;if("cancel"!==e)return i.html2tml(i.editor.getContent()).done((function(e){console.log("data=",e),t(i.shell.txtarea).val(e)})).fail((function(){i.shell.showMessage("error","Error calling html2tml")}))},e.prototype.initGui=function(){var e=this;e.shell.container.addClass("ui-natedit-wysiwyg-enabled"),t.each(e.opts.tinymce.formats,(function(i){e.editor.formatter.formatChanged(i,(function(o,r){t.each(e.editor.formatter.get(i),(function(t,i){o?e.shell.toolbar.find(i.toolbar).addClass("ui-natedit-active"):e.shell.toolbar.find(i.toolbar).removeClass("ui-natedit-active")})),e.shell.toolbar.find(".ui-natedit-numbered").removeClass("ui-natedit-active"),e.shell.toolbar.find(".ui-natedit-bullet").removeClass("ui-natedit-active"),t.each(r.parents,(function(i,o){var n=t(o),a=t(r.parents[i+1]);n.is("li")&&(a.is("ol")?e.shell.toolbar.find(".ui-natedit-numbered").addClass("ui-natedit-active"):e.shell.toolbar.find(".ui-natedit-bullet").addClass("ui-natedit-active"))}))}))})),e.editor.on("change",(function(){e.updateUndoButtons()})),e.updateUndoButtons()},e.prototype.updateUndoButtons=function(){var t=this,e=t.shell.container.find(".ui-natedit-undo"),i=t.shell.container.find(".ui-natedit-redo"),o=t.editor.undoManager;o.hasUndo()?e.button("enable"):e.button("disable"),o.hasRedo()?i.button("enable"):i.button("disable")},e.prototype.on=function(t,e){return this.editor.on(t,e),this.editor},e.prototype.handleToolbarAction=function(e){var i=this,o=t.extend({},e.data()),r=o.markup;if(void 0!==r){if("numberedListMarkup"===r)return i.shell.toolbar.find(".ui-natedit-numbered").addClass("ui-natedit-active"),i.shell.toolbar.find(".ui-natedit-bullet").removeClass("ui-natedit-active"),void i.editor.execCommand("InsertOrderedList");if("bulletListMarkup"===r)return i.shell.toolbar.find(".ui-natedit-numbered").removeClass("ui-natedit-active"),i.shell.toolbar.find(".ui-natedit-bullet").addClass("ui-natedit-active"),void i.editor.execCommand("InsertUnorderedList");i.editor.formatter.get(r)&&(delete o.markup,i.editor.formatter.toggle(r))}return o},e.prototype.tml2html=function(e){var i=foswiki.getScriptUrl("rest","WysiwygPlugin","tml2html");return t.post(i,{topic:foswiki.getPreference("WEB")+"."+foswiki.getPreference("TOPIC"),t:(new Date).getTime(),text:e})},e.prototype.html2tml=function(e){var i=foswiki.getScriptUrl("rest","WysiwygPlugin","html2tml");return t.post(i,{topic:foswiki.getPreference("WEB")+"."+foswiki.getPreference("TOPIC"),t:(new Date).getTime(),text:e})},e.prototype.insert=function(t){this.editor.insertContent(t)},e.prototype.getImageData=function(t){var e,i=this.editor.selection.getNode();return i&&"IMG"===i.nodeName&&(t.width=i.width||t.width,t.height=i.height||t.height,e=this.shell.parseUrl(i.src),t.web=e.web||t.web,t.topic=e.topic||t.topic,t.file=e.file||t.file),t},e.prototype.insertImage=function(e){var i,o=foswiki.getPubUrlPath(e.web,e.topic,e.file);console.log("insertImage, opts=",e),i=t("<img />").attr({src:o,"data-mce-src":o}),e.width&&i.attr("width",e.width),e.height&&i.attr("height",e.height),e.align&&i.attr("align",e.align),i=i.get(0).outerHTML,this.remove(),this.insert(i)},e.prototype.remove=function(){return this.editor.selection.setContent("")},e.prototype.getSelection=function(){return this.editor.selection.getContent()},e.prototype.getSelectionLines=function(){for(var e=this,i=e.editor.selection.getRng(),o=i.startOffset,r=i.endOffset,n=e.editor.selection.getNode(),a=t(n).text();o>0&&13!==a.charCodeAt(o-1)&&10!==a.charCodeAt(o-1);)o--;for(;r<a.length&&13!==a.charCodeAt(r)&&10!==a.charCodeAt(r);)r++;return r>=a.length&&(r=a.length-1),i.setStart(n,o),e.editor.selection.setRng(i),a},e.prototype.setCaretPosition=function(t){return this.editor.selection.setCursorLocation(void 0,t)},e.prototype.getCaretPosition=function(){return this.editor.selection.getEnd()},e.prototype.hasChanged=function(){return this.editor.isDirty()},e.prototype.undo=function(){this.editor.undoManager.undo(),this.updateUndoButtons()},e.prototype.redo=function(){this.editor.undoManager.redo(),this.updateUndoButtons()},e.prototype.insertLineTag=function(t){var e=this,i=t[0],o=e.getSelectionLines()||t[1],r=t[2];e.shell.log("selection=",o),e.editor.selection.setContent(i+o+r)},e.prototype.insertTag=function(t){var e=t[0],i=this.getSelection()||t[1],o=t[2];this.editor.selection.setContent(e+i+o)},e.prototype.removeFormat=function(){this.editor.execCommand("RemoveFormat")},e.prototype.applyColor=function(t){this.editor.execCommand("mceApplyTextcolor","forecolor",t)},e.prototype.insertTable=function(t){var e,i=this;t.selection=i.getTableSelection(),e=i.generateHTMLTable(t),i.insert(e)},e.prototype.insertLink=function(t){var e,i;if(void 0!==t.url){if(""===t.url)return;e=void 0!==t.text&&""!==t.text?"<a href='"+t.url+"'>"+t.text+"</a>":"<a href='"+t.url+"'>"+t.url+"</a>"}else if(void 0!==t.file){if(void 0===t.web||""===t.web||void 0===t.topic||""===t.topic)return;i="%PUBURLPATH%/"+t.web+"/"+t.topic+"/"+t.file,t.file.match(/\.(bmp|png|jpe?g|gif|svg)$/i)&&!t.text?e="<img src='"+i+"' alt='"+t.file+"' height='320' />":(e="<a href='"+i+"'>",void 0!==t.text&&""!==t.text?e+=t.text:e+=t.file,e+="</a>")}else{if(void 0===t.topic||""===t.topic)return;e="<a href='"+(i=t.web+"."+t.topic)+"'>",void 0!==t.text&&""!==t.text?e+=t.text:e+=t.topic,e+="</a>"}this.remove(),this.insert(e)},e.prototype.setValue=function(t){this.editor.setContent(t)},e.prototype.getValue=function(){return this.editor.getContent()},e.prototype.searchReplace=function(t,e,i){throw")"},e.prototype.getWrapperElement=function(){return this.editor?t(this.editor.contentAreaContainer).children("iframe"):null},e.prototype.focus=function(){this.editor.focus()},e.prototype.setSize=function(e,i){var o=t(this.editor.getContainer());e=e||"auto",i=i||"auto",o&&(e&&o.css("width",e),i&&(i-=200,o.css("height",i)))},e.prototype.toggleFullscreen=function(){this.editor.execCommand("mceFullScreen")},e.defaults={debug:!0,natedit:{},tinymce:{selector:"textarea#topic",min_height:300,menubar:!1,toolbar:!1,statusbar:!1,plugins:"table searchreplace paste lists hr legacyoutput -natedit-image textpattern fullscreen",table_toolbar:"tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol",table_appearance_options:!1,table_advtab:!1,table_cell_advtab:!1,table_row_advtab:!1,object_resizing:"img",paste_data_images:!0,content_css:[],style_formats_autohide:!0,removeformat:[{selector:"div,p,pre",remove:"all"}],formats:{h1Markup:{block:"h1",toolbar:".ui-natedit-h1"},h2Markup:{block:"h2",toolbar:".ui-natedit-h2"},h3Markup:{block:"h3",toolbar:".ui-natedit-h3"},h4Markup:{block:"h4",toolbar:".ui-natedit-h4"},h5Markup:{block:"h5",toolbar:".ui-natedit-h5"},h6Markup:{block:"h6",toolbar:".ui-natedit-h6"},normalMarkup:{block:"p",toolbar:".ui-natedit-normal"},quoteMarkup:{block:"blockquote",toolbar:".ui-natedit-quoted"},boldMarkup:{inline:"b",toolbar:".ui-natedit-bold"},italicMarkup:{inline:"i",toolbar:".ui-natedit-italic"},monoMarkup:{inline:"code",toolbar:".ui-natedit-mono"},underlineMarkup:{inline:"span",styles:{"text-decoration":"underline"},toolbar:".ui-natedit-underline"},strikeMarkup:{inline:"span",styles:{"text-decoration":"line-through"},toolbar:".ui-natedit-strike"},superscriptMarkup:{inline:"sup",toolbar:".ui-natedit-super"},subscriptMarkup:{inline:"sub",toolbar:".ui-natedit-sub"},leftMarkup:{block:"p",attributes:{align:"left"},toolbar:".ui-natedit-left"},rightMarkup:{block:"p",attributes:{align:"right"},toolbar:".ui-natedit-right"},centerMarkup:{block:"p",attributes:{align:"center"},toolbar:".ui-natedit-center"},justifyMarkup:{block:"p",attributes:{align:"justify"},toolbar:".ui-natedit-justify"},verbatimMarkup:{block:"pre",classes:"TMLverbatim",toolbar:".ui-natedit-verbatim"}},textpattern_patterns:[{start:"__",end:"__",format:["italicMarkup","boldMarkup"]},{start:"==",end:"==",format:["boldMarkup","monoMarkup"]},{start:"_",end:"_",format:"italicMarkup"},{start:"=",end:"=",format:"monoMarkup"},{start:"*",end:"*",format:"boldMarkup"},{start:"---",replacement:"<hr />"},{start:"---+ ",format:"h1Markup"},{start:"---++ ",format:"h2Markup"},{start:"---+++ ",format:"h3Markup"},{start:"---++++ ",format:"h4Markup"},{start:"---+++++ ",format:"h5Markup"},{start:"---++++++ ",format:"h6Markup"},{start:"1 ",cmd:"InsertOrderedList"},{start:"* ",cmd:"InsertUnorderedList"}]}},t.NatEditor.engines.TinyMCEEngine={createEngine:function(t){return new e(t).init()}}}(jQuery);