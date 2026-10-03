// Exercise update decisions without downloading releases or restarting Electron.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function harness({ packaged = true, mas = false, platform = 'darwin' } = {}) {
  const events = {};
  const messages = [];
  let checks = 0;
  let installs = 0;
  let response = 1;
  const updater = {
    on: (event, callback) => { events[event] = callback; },
    checkForUpdates: async () => { checks++; return { downloadPromise: null }; },
    quitAndInstall: () => { installs++; },
  };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../dist-electron/updates.js'), 'utf8'), {
    exports,
    require: (name) => name === 'electron' ? {
      app: { isPackaged: packaged, once() {} },
      dialog: { showMessageBox: async (message) => { messages.push(message); return { response }; } },
    } : { autoUpdater: updater },
    process: { platform, mas },
    console: { warn() {} },
    setInterval: () => ({ unref() {} }),
    clearInterval() {},
  });
  return { exports, events, messages, updater, checks: () => checks, installs: () => installs,
    choose: (value) => { response = value; } };
}

(async () => {
  for (const options of [{ packaged: false }, { mas: true }, { platform: 'linux' }]) {
    const h = harness(options);
    h.exports.startUpdates();
    await h.exports.checkForUpdates();
    assert.equal(h.checks(), 0);
  }
  let h = harness();
  await h.exports.checkForUpdates(true);
  assert.equal(h.messages[0].message, 'Morph is up to date.');
  h.exports.startUpdates();
  assert.equal(h.updater.autoDownload, true);
  assert.equal(h.updater.autoInstallOnAppQuit, false);
  h.events['update-downloaded']();
  await Promise.resolve();
  assert.equal(h.installs(), 0, 'Later must not restart the app');
  h.choose(0);
  await h.exports.checkForUpdates(true);
  assert.equal(h.installs(), 1, 'An explicit restart installs the downloaded update');

  h = harness();
  h.updater.checkForUpdates = async () => { throw new Error('offline'); };
  await h.exports.checkForUpdates();
  assert.equal(h.messages.length, 0, 'Background failures stay quiet');
  await h.exports.checkForUpdates(true);
  assert.equal(h.messages[0].type, 'warning');

  h = harness();
  let finish;
  h.updater.checkForUpdates = async () => ({ downloadPromise: new Promise(resolve => { finish = resolve; }) });
  const pending = h.exports.checkForUpdates();
  await Promise.resolve();
  await h.exports.checkForUpdates(true);
  assert.match(h.messages[0].message, /already checking/);
  finish();
  await pending;
  assert.equal(h.messages.length, 1, 'A download must not display an up-to-date message');
  console.log('updates: all assertions passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
