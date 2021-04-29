#!/bin/bash

TMP_DEMO_DIR=.gh-pages

ember build -e production
git clone https://github.com/sophypal/experiments.git ${TMP_DEMO_DIR}
cd ${TMP_DEMO_DIR}
git checkout gh-pages
git rm -rf *
cp -r ../dist/* .
git add --all
git commit -m "gh-pages publish"
git push origin gh-pages > /dev/null 2>&1