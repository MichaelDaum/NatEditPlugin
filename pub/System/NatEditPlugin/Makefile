FOSWIKI_ROOT?=~/foswiki/core
TARGET=\
  build/bundle.js \
  build/styles.css \
  build/CodemirrorEngine.js \
  build/TinyMCEEngine.js \

#  build/ProsemirrorEngine.js \
  build/TextareaEngine.js \
  build/TinyMCENativeEngine.js \

-include $(FOSWIKI_ROOT)/pub/System/JQueryPlugin/Makefile.include

TEXTAREA_ENGINE_SOURCE=\
  src/TextareaState.uncompressed.js \
  src/UndoManager.uncompressed.js \
  src/RawEngine.uncompressed.js 

BUNDLE_SOURCE=\
  src/Utils.uncompressed.js \
  src/EmojiWidget.uncompressed.js \
  src/LinkWidget.uncompressed.js \
  src/DropDownMenu.uncompressed.js \
  src/NatEdit.uncompressed.js \
  src/PermissionsEditor.uncompressed.js \
  src/BaseEngine.uncompressed.js 

build/TextareaEngine.uncompressed.js: $(TEXTAREA_ENGINE_SOURCE)
	@echo generating $@; cat $^ > $@

build/bundle.uncompressed.js: $(BUNDLE_SOURCE)
	@echo generating $@; cat $^ > $@
