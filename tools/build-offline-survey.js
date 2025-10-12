const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'survey');
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');
const iconsDir = path.join(distDir, 'icons');

const SURVEY_URL =
  process.env.SURVEY_URL ||
  'https://example.com/survey';

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function copyFile(source, target) {
  await ensureDir(path.dirname(target));
  await fs.promises.copyFile(source, target);
}

async function writeFile(target, contents) {
  await ensureDir(path.dirname(target));
  await fs.promises.writeFile(target, contents, 'utf8');
}

async function makeIconSvg() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b3d91"/>
      <stop offset="100%" stop-color="#00b4d8"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <path d="M128 184c0-17.673 14.327-32 32-32h192c17.673 0 32 14.327 32 32v24c0 13.255-10.745 24-24 24h-56l-24 48h-80l-24-48h-24c-13.255 0-24-10.745-24-24v-24z" fill="#ffffff" opacity="0.9"/>
  <path d="M168 320h176c13.255 0 24 10.745 24 24v40c0 17.673-14.327 32-32 32H176c-17.673 0-32-14.327-32-32v-32c0-17.673 14.327-32 32-32z" fill="#ffffff" opacity="0.85"/>
  <circle cx="196" cy="204" r="20" fill="#03045e"/>
  <circle cx="256" cy="206" r="28" fill="#03045e"/>
  <circle cx="316" cy="204" r="20" fill="#03045e"/>
  <path d="M208 332h96c8.837 0 16 7.163 16 16s-7.163 16-16 16h-96c-8.837 0-16-7.163-16-16s7.163-16 16-16z" fill="#03045e" opacity="0.8"/>
</svg>
`;
  await writeFile(path.join(iconsDir, 'icon.svg'), svg.trimStart());
}

async function generateQrCard() {
  const qrPath = path.join(assetsDir, 'survey-qr.png');
  await QRCode.toFile(qrPath, SURVEY_URL, {
    width: 512,
    margin: 2,
    color: {
      dark: '#0b3d91',
      light: '#ffffffff'
    }
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Repricing Survey Access</title>
  <style>
    :root { color-scheme: light; font-family: "Segoe UI", Arial, sans-serif; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f6fa;
    }
    .card {
      border: 2px solid #0b3d91;
      border-radius: 16px;
      padding: 32px 40px;
      text-align: center;
      max-width: 420px;
      background: #fff;
      box-shadow: 0 20px 40px rgba(11, 61, 145, 0.18);
    }
    h1 { margin: 0 0 12px; font-size: 1.8rem; color: #0b3d91; }
    p { margin: 0 0 10px; color: #1f2633; line-height: 1.5; }
    img { width: 220px; height: 220px; margin: 16px auto; display: block; }
    .link {
      font-weight: 600;
      color: #1f2633;
      word-break: break-all;
      font-size: 0.95rem;
    }
    ol {
      text-align: left;
      padding-left: 1.2rem;
      margin: 18px 0 0;
      color: #1f2633;
    }
    li { margin: 0 0 6px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Join the Survey</h1>
    <p>Scan the QR code or enter the link to launch the repricing survey.</p>
    <img src="./assets/survey-qr.png" alt="Repricing Survey QR code" />
    <p class="link">${SURVEY_URL}</p>
    <ol>
      <li>Load the page once while online.</li>
      <li>Add it to your home screen to keep an offline copy.</li>
      <li>Reconnect before submitting so answers sync.</li>
    </ol>
  </div>
</body>
</html>
`;

  await writeFile(path.join(distDir, 'qr-card.html'), html);
}

async function main() {
  fs.rmSync(distDir, { recursive: true, force: true });
  await ensureDir(distDir);
  await ensureDir(assetsDir);
  await ensureDir(iconsDir);

  const htmlSource = await fs.promises.readFile(
    path.join(srcDir, 'index.html'),
    'utf8'
  );
  await writeFile(path.join(distDir, 'index.html'), htmlSource);

  await copyFile(path.join(srcDir, 'style.css'), path.join(distDir, 'style.css'));
  await copyFile(path.join(srcDir, 'survey.js'), path.join(distDir, 'survey.js'));
  await copyFile(
    path.join(srcDir, 'service-worker.js'),
    path.join(distDir, 'service-worker.js')
  );
  await copyFile(
    path.join(srcDir, 'manifest.webmanifest'),
    path.join(distDir, 'manifest.webmanifest')
  );

  await makeIconSvg();
  await generateQrCard();

  console.log('✔ Offline bundle ready in dist/');
  console.log(`✔ QR code points to: ${SURVEY_URL}`);
  console.log('Hint: run `npx serve dist` or host the folder statically.');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exitCode = 1;
});
