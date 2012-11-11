UGLIFY = ./node_modules/.bin/uglifyjs
LESSC = ./node_modules/.bin/lessc
BROWSERIFY =  ./node_modules/.bin/browserify

UGLIFY_FLAGS =
LESSC_FLAGS = --yui-compress

FILES = public/bundle.min.js public/styles.min.css

all: node_modules ${FILES}

debug: UGLIFY_FLAGS := -b -nm
debug: LESSC_FLAGS :=
debug: all

clean:
	rm -rf ${FILES} build

node_modules:
	npm install

build:
	mkdir build

build/bundle.js: src/app.js src/cubesvr.js build
	${BROWSERIFY} $< -o $@

public/bundle.min.js: build/bundle.js
	${UGLIFY} ${UGLIFY_FLAGS} $^ > $@

build/styles.css: src/styles.less build
	${LESSC} $< > $@

public/styles.min.css: build/styles.css
	${LESSC} ${LESSC_FLAGS} $^ > $@
