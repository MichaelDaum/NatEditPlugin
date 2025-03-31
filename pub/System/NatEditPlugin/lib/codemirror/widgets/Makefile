FOSWIKI_ROOT?=~/foswiki/trunk/core
TARGET=widgets.js

WIDGETS_SOURCE=utils.js image-widget.js 

#codemirror-widgets.js utils.js image-widget.js 

#table-widget.js

-include $(FOSWIKI_ROOT)/pub/System/JQueryPlugin/Makefile.include

widgets.uncompressed.js: $(WIDGETS_SOURCE)
	cat $^ > $@

git: codemirror-widgets

codemirror-widgets:
	git clone https://github.com/macrat/codemirror-widgets.git

codemirror-widgets.js: codemirror-widgets
	cd codemirror-widgets && browserify lib/index.js -o ../$@
