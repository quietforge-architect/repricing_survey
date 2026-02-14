module.exports = {
  port: 4173,
  open: 'survey.html',
  watchOptions: {
    ignoreInitial: true
  },
  files: ['src/html/**/*.{html,css,js,webmanifest,svg,png}'],
  server: {
    baseDir: 'src/html',
    index: 'survey.html'
  },
  logSnippet: true,
  notify: false
};
