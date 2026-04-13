install:
  npm install

build: install
  npm run build

test:
  npm run test

publish: build test
  npm publish