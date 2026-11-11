#!/usr/bin/env python3
"""Writes the screenshot seed (store/seed/seed.json, from generate.mjs) into CardTastic's store on an iOS
simulator or the Android emulator BEFORE the app launches, so it opens on Home with sound off, every How to
Play seen, three weeks of stats, achievements and the recent wins personal par is made from, and saved games
for the gameplay shots. See store/README.md (iOS) and store/google-play.md (Android).

  write-store.py <simulator udid> [--style <hex color>]
  write-store.py --android [<adb serial>] [--style <hex color>]

--style also switches the card faces to Decorated, the back to Ornate and Guest's color to <hex> (the
"Your Cards, Your Colors" shot used #009688, which gives a red felt). The app must not be running (on
Android this stops it first).

The store is redux-persist on @react-native-async-storage. On iOS it's Library/Application Support/<bundle
id>/RCTAsyncLocalStorage_V1, with values over 1024 characters in a file named by the MD5 of the key. On
Android it's the SQLite database databases/RKStorage (table catalystLocalStorage), reachable only through
`adb shell run-as`, so the APK must be debuggable: a release build with `debuggable true` in
android/app/build.gradle's release block (google-play.md, Screenshots). The app must have launched once, so
the database exists. Slices left out of solitaire:root keep their initial state.

Every key is KEY_PREFIX + redux-persist key. The prefix is the keyPrefix in src/redux/store.ts (the root) and
src/redux/gameInProgressSlice.ts (one key per game): it was redux-persist's default 'persist:' until 2026-10-17,
when every Tastic game started sharing one web origin. Keep it in step with those two files, or the app
ignores everything this writes.
"""
import hashlib
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile

BUNDLE = 'com.infinitetoken.solitaire'  # iOS: the App Store record's, kept through the CardTastic rename
PACKAGE = 'com.infinitetoken.cardtastic'  # Android
KEY_PREFIX = 'solitaire:'
HERE = os.path.dirname(os.path.abspath(__file__))
# Each two-player game's How to Play, seen, so none opens over a screenshot (src/redux/store.ts' TABLE_GAME_STORES).
TABLE_GUIDES = ['ratslapGuide', 'slapjackGuide', 'sixCardGolfGuide', 'trashGuide', 'warGuide', 'speedGuide', 'ginRummyGuide', 'fourCrownsGuide', 'crazyEightsGuide']

args = sys.argv[1:]
style = args[args.index('--style') + 1] if '--style' in args else None
android = '--android' in args
serial = None
if android:
    rest = args[args.index('--android') + 1:]
    serial = rest[0] if rest and not rest[0].startswith('--') else None
else:
    udid = args[0]
seed = json.load(open(os.path.join(HERE, 'seed.json')))
entries = {}


def write(key, value):
    entries[key] = value


persisted = json.dumps({'version': -1, 'rehydrated': True})
seen = json.dumps({'versionSeen': 1})
root = {
    'achievements': json.dumps({'stats': seed['stats'], 'unlocked': seed['unlocked']}),
    'sound': json.dumps({'enabled': False}),
    'guide': seen,
    'recentWins': json.dumps(seed['recentWins']),
}
for key in TABLE_GUIDES:
    root[key] = seen
if style:
    root['settings'] = json.dumps({'cardStyle': 'decorated', 'cardBackStyle': 'ornate'})
    root['tableColor'] = json.dumps({'guestColor': style, 'profileColors': {}})
root['_persist'] = persisted
write(KEY_PREFIX + 'root', json.dumps(root))


# Saved games are Guest's (each game's slot is keyed by owner), at a human pace of about 3 seconds a move.
# foundationLayout is src/engine/foundation.ts' FOUNDATION_LAYOUT: generate.mjs plays the current rules, whose
# foundations run spades, diamonds, clubs, hearts. A save without it is taken for one from before 2026-10-20 and its
# foundations are moved to new slots (stores/gameInProgress.ts), which scrambles them: hearts in the spades slot.
FOUNDATION_LAYOUT = 1


def save_game(game, board, elapsed, config=None):
    saved = {'state': board['state'], 'undoStack': [], 'moves': board['moves'], 'elapsedSeconds': elapsed, 'foundationLayout': FOUNDATION_LAYOUT}
    if config is not None:
        saved['config'] = config
    write(KEY_PREFIX + 'gameInProgress.' + game, json.dumps({'guest': json.dumps(saved), '_persist': persisted}))


save_game('freecell', seed['finish'], round(seed['finish']['decisions'] * 2.6))
save_game('klondike', seed['boards']['klondike'], seed['boards']['klondike']['moves'] * 3, config=1)
save_game('yukon', seed['boards']['yukon'], seed['boards']['yukon']['moves'] * 3)


def write_ios():
    container = subprocess.check_output(['xcrun', 'simctl', 'get_app_container', udid, BUNDLE, 'data'], text=True).strip()
    store_dir = os.path.join(container, 'Library/Application Support', BUNDLE, 'RCTAsyncLocalStorage_V1')
    shutil.rmtree(store_dir, ignore_errors=True)
    os.makedirs(store_dir)
    manifest = {}
    for key, value in entries.items():
        if len(value) > 1024:
            open(os.path.join(store_dir, hashlib.md5(key.encode()).hexdigest()), 'w').write(value)
            manifest[key] = None
        else:
            manifest[key] = value
    json.dump(manifest, open(os.path.join(store_dir, 'manifest.json'), 'w'))


def write_android():
    adb = ['adb'] + (['-s', serial] if serial else [])
    run_as = adb + ['shell', 'run-as', PACKAGE]
    subprocess.check_call(adb + ['shell', 'am', 'force-stop', PACKAGE])
    with tempfile.TemporaryDirectory() as tmp:
        db_path = os.path.join(tmp, 'RKStorage')
        with open(db_path, 'wb') as f:
            f.write(subprocess.check_output(run_as + ['cat', 'databases/RKStorage']))
        db = sqlite3.connect(db_path)
        db.execute('PRAGMA journal_mode=DELETE')
        db.execute('DELETE FROM catalystLocalStorage')
        db.executemany('INSERT INTO catalystLocalStorage (key, value) VALUES (?, ?)', entries.items())
        db.commit()
        db.close()
        # Stale journal files would replay over the new database on the next open.
        subprocess.call(run_as + ['rm', '-f', 'databases/RKStorage-journal', 'databases/RKStorage-wal', 'databases/RKStorage-shm'])
        with open(db_path, 'rb') as f:
            # One string, so the redirect happens inside run-as's shell (adb shell joins its arguments with spaces).
            subprocess.run(adb + ['shell', f"run-as {PACKAGE} sh -c 'cat > databases/RKStorage'"], stdin=f, check=True)
        local = hashlib.md5(open(db_path, 'rb').read()).hexdigest()
        remote = hashlib.md5(subprocess.check_output(run_as + ['cat', 'databases/RKStorage'])).hexdigest()
        if local != remote:
            sys.exit('the database on the device does not match the one written')


write_android() if android else write_ios()
print('seeded', ', '.join(entries))
