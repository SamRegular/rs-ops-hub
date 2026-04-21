import fs from 'fs';

const css = fs.readFileSync('./dist/assets/index-CjfmyxNK.css', 'utf-8');
const js = fs.readFileSync('./dist/assets/index-CqqeW1xv.js', 'utf-8');
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
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>${js}</script>
  </body>
</html>`;

fs.writeFileSync('./dist/rs-ops-hub-bundle.html', bundledHtml);
console.log('✓ Bundle created successfully');
console.log('File: dist/rs-ops-hub-bundle.html');
