FOSWIKI_ROOT?=~/foswiki/core
SUBDIRS=lib/codemirror lib/dompurify
TARGET=\
  build \
  build/bundle.js \
  build/bundle.css 

#  build/ProsemirrorEngine.js \
  build/TextareaEngine.js \
  build/TinyMCENativeEngine.js \

-include $(FOSWIKI_ROOT)/pub/System/JQueryPlugin/Makefile.include

TEXTAREA_ENGINE_SOURCE=\
  src/TextareaState.js \
  src/Table.js \
  src/Attrs.js \
  src/UndoManager.js \
  src/RawEngine.js 

BUNDLE_SOURCE=\
  lib/dompurify/purify.js \
  src/Utils.js \
  src/EmojiWidget.js \
  src/LinkWidget.js \
  src/ImageWidget.js \
  src/DropDownMenu.js \
  src/Table.js \
  src/Attrs.js \
  src/FormManager.js \
  src/NatEdit.js \
  src/PermissionsEditor.js \
  src/BaseEngine.js \
  src/CodemirrorEngine.js \
  src/TinyMCEEngine.js 

.PRECIOUS: $(TARGET)

clean:
	@rm -f build/*

build:
	@mkdir build

build/TextareaEngine.js: $(TEXTAREA_ENGINE_SOURCE)
	@echo generating $@; $(JSMIN) $^ > $@

build/bundle.js: $(BUNDLE_SOURCE)
	@echo generating $@; $(JSMIN) $^ > $@

build/bundle.css: src/styles.css
	@echo generating $@; $(CAT) $^ | $(CSSMIN) $(CSSMIN_ARGS) > $@

build/%.js: src/%.js
	@echo generating $@; $(JSMIN) $^ > $@
