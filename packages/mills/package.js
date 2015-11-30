Package.describe({
  name: 'mills',
  version: '0.0.1',
  summary: 'Nine Men\'s Morris game logic'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.addFiles('mills.js');
  api.export('Mills');
});

Package.onTest(function(api) {
  api.use(['ecmascript', 'tinytest', 'mills']);
  api.addFiles('mills-tests.js');
});
