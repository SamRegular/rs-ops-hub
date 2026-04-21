const fs = require('fs');
const path = require('path');

const cssPath = './dist/assets/index-CjfmyxNK.css';
const jsPath = './dist/assets/index-CqqeW1xv.js';
const htmlPath = './dist/index.html';

const css = fs.readFileSync(cssPath, 'utf-8');
const js = fs.readFileSync(jsPath, 'utf-8');
const logoBase64 = fs.readFileSync('./dist/logo.svg', 'base64');

const bundledHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RS Ops Hub</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
      ${css}
    </style>
    <style>
      /* Fix logo display in bundle */
      [data-logo] {
        content: url('data:image/svg+xml;base64,${logoBase64}');
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      ${js}
    </script>
  </body>
</html>`;

fs.writeFileSync('./dist/rs-ops-hub-bundle.html', bundledHtml);
console.log('✓ Created bundled HTML: dist/rs-ops-hub-bundle.html');
