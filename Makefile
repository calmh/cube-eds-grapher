UGLIFY = ./node_modules/.bin/uglifyjs
LESSC = ./node_modules/.bin/lessc
BROWSERIFY =  ./node_modules/.bin/browserify

UGLIFY_FLAGS =
LESSC_FLAGS = --yui-compress

FILES = public/bundle.min.js

all: ${FILES}

debug: UGLIFY_FLAGS := -b -ns
debug: LESSC_FLAGS :=
debug: all

clean:
	rm -f ${FILES}

bundle.js: app.js
	${BROWSERIFY} $^ -o $@

public/bundle.min.js: bundle.js
	${UGLIFY} ${UGLIFY_FLAGS} $^ > $@
