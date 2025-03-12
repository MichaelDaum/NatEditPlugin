FOSWIKI_ROOT?=~/foswiki/trunk/core
TARGET=dist/pkg.js

PKG_JS_SRC=src/editor.js

all: $(TARGET)

dist/pkg.js: $(PKG_JS_SRC) rollup.config.mjs package.json
	@npm run build

clean: 
	rm -f dist/*
