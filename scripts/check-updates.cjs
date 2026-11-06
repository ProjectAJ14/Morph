// Exercise update decisions without downloading releases or restarting Electron.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function harness({ packaged = true, mas = false, platform = 'darwin', focused = null } = {}) {
  const events = {};
  const messages = [];
  let checks = 0;
  let installs = 0;
  const ready = [];
  const quitting = [];
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
      BrowserWindow: { getFocusedWindow: () => focused },
      // (options) or (parent, options): record the options, and the parent when given
      dialog: { showMessageBox: async (...args) => {
        const message = args.length === 2 ? { ...args[1], parent: args[0] } : args[0];
        messages.push(message);
        return { response: 0 };
      } },
    } : { autoUpdater: updater },
    process: { platform, mas },
    console: { warn() {} },
    setInterval: () => ({ unref() {} }),
    clearInterval() {},
  });
  const start = () => exports.startUpdates({
    onReady: (v) => ready.push(v),
    onBeforeRestart: () => quitting.push(true),
    onRestartAborted: () => quitting.push(false),
  });
  return { exports, events, messages, updater, ready, quitting, start, checks: () => checks, installs: () => installs };
}

(async () => {
  for (const options of [{ packaged: false }, { mas: true }, { platform: 'linux' }]) {
    const h = harness(options);
    h.start();
    await h.exports.checkForUpdates();
    assert.equal(h.checks(), 0);
  }
  let h = harness();
  await h.exports.checkForUpdates(true);
  assert.equal(h.messages[0].message, 'Morph is up to date.');
  h.start();
  assert.equal(h.updater.autoDownload, true);
  assert.equal(h.updater.autoInstallOnAppQuit, true, 'Quit installs a downloaded update');
  h.exports.installUpdate();
  assert.equal(h.installs(), 0, 'Nothing to install before a download');
  h.events['update-downloaded']({ version: '9.9.9' });
  assert.deepEqual(h.ready, ['9.9.9'], 'A download lights the rail tile');
  assert.equal(h.exports.getReadyVersion(), '9.9.9');
  h.messages.length = 0;
  await h.exports.checkForUpdates(true);
  assert.equal(h.installs(), 0, 'The menu never installs; it points at the tile');
  assert.match(h.messages[0].message, /9\.9\.9 is ready/);
  h.exports.installUpdate();
  h.exports.installUpdate();
  assert.equal(h.installs(), 1, 'The tile installs once');
  assert.deepEqual(h.quitting, [true], 'Main lets windows close before quitAndInstall');
  h.events.error(new Error('install failed'));
  assert.deepEqual(h.quitting, [true, false], 'A failed install keeps the app alive');
  assert.deepEqual(h.ready, ['9.9.9', null], 'A failed install clears the tile');
  assert.equal(h.exports.getReadyVersion(), null);
  assert.equal(h.messages.at(-1).type, 'warning', 'A failed install says so');

  // A background error with an update waiting stays quiet and keeps the tile.
  h = harness();
  h.start();
  h.events['update-downloaded']({ version: '9.9.9' });
  h.events.error(new Error('feed hiccup'));
  assert.deepEqual(h.ready, ['9.9.9']);
  assert.equal(h.messages.length, 0);
  assert.equal(h.exports.getReadyVersion(), '9.9.9');

  // quitAndInstall throwing outright takes the same abort path.
  h.updater.quitAndInstall = () => { throw new Error('not signed'); };
  h.exports.installUpdate();
  assert.deepEqual(h.quitting, [true, false], 'A throwing install keeps the app alive');
  assert.deepEqual(h.ready, ['9.9.9', null]);
  h.events['update-downloaded']({ version: '9.9.10' });
  assert.equal(h.exports.getReadyVersion(), '9.9.10', 'The next download lights the tile again');

  // Dialogs open over the window the user is looking at.
  const win = { id: 'focused' };
  h = harness({ focused: win });
  await h.exports.checkForUpdates(true);
  assert.equal(h.messages[0].parent, win);

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
