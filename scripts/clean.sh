#!/bin/bash

# TOP LEVEL
rm -rf .hc*
rm -rf target
# WEBCOMPONENTS
rm -rf webcomponents/dist
rm -rf webcomponents/src/generated
rm webcomponents/tsconfig.tsbuildinfo
# WE-APPLET
rm -rf we-applet/.rollup.cache/
rm -rf we-applet/out-tsc/
rm -rf we-applet/dist/
rm we-applet/.hc*
rm we-applet/tsconfig.tsbuildinfo
rm we-applet/webhapp.workdir/threads-applet.webhapp
# WEBAPP
rm -rf webapp/dist/
rm -rf webapp/out-tsc/
rm webapp/tsconfig.tsbuildinfo
