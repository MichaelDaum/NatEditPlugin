FOSWIKI_ROOT?=~/foswiki/trunk/core
TARGET=pkg.css pkg.js
SUBDIRS=lib mode widgets

-include $(FOSWIKI_ROOT)/pub/System/JQueryPlugin/Makefile.include

PKG_CSS_SRC=\
	lib/codemirror.uncompressed.css \
	theme/foswiki.css addon/search/matchesonscrollbar.css \
	addon/dialog/dialog.css

PKG_JS_SRC=\
	addon/display/placeholder.js \
	addon/mode/loadmode.js \
	addon/fold/foldcode.js \
	addon/fold/foldgutter.js \
	addon/search/searchcursor.js \
	addon/scroll/annotatescrollbar.js \
	addon/search/matchesonscrollbar.js \
	addon/edit/matchbrackets.js \
	addon/dialog/dialog.js \
	keymap/sublime.js \
	keymap/vim.js

pkg.css: $(PKG_CSS_SRC)
	@echo generating $@
	@$(CAT) $^| $(CSSMIN) > $@

pkg.js: $(PKG_JS_SRC)
	@echo generating $@
	@$(JSMIN) $^ > $@

clean: 
	rm -f $(TARGET) *gz 
