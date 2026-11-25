# Google Play

CardTastic for Android ships through Google Play, from the Infinite Token organization developer account (opened 2026-11-11). The Android app is this repo's Expo app, package `com.infinitetoken.cardtastic`, built by EAS as an app bundle (`.aab`); Google signs it for the store with the Play App Signing key, and EAS keeps the upload key. It has never been on Play, so this is a first submission.

Checked 2026-11-11 against Play Console Help and the Developer Program Policies (the app-store-prep skill's Google Play reference).

## What Google asks of CardTastic

- **No closed test:** the 12-tester, 14-day closed test only binds personal accounts made after November 13, 2023, so the organization account publishes to production straight away.
- **Target API level:** new apps must target API 36 (Android 16) since 2026-08-31. Expo SDK 58 targets 36 by default, so nothing is set here.
- **Selling:** nothing is sold anywhere. No in-app purchases, no ads, no prices in the listing.
- **Account deletion:** there's no sign-in, but since 1.3.0 each profile that plays a Daily Deal gets an anonymous player on Tastic-Server, deleted in the app (a profile's Edit Profile screen, Online, Delete Online Data) or with the profile. Play wants a web page for deleting it without the app, as HexFleet's https://games.infinitetoken.com/delete-data/hexfleet: CardTastic's is https://games.infinitetoken.com/delete-data/cardtastic (made on Games-Web 2026-11-25; live once Games-Web is released): the in-app steps, an email route by the tag and color shown on the boards and a Daily won, and that nothing stays on the server.
- **Families policy:** not applicable. The target audience is 13 and over (Jay, 2026-11-11), so the app is outside it. It would pass today (no ads, no ad SDKs, nothing collected but the update check), but it would bind every later update.
- **Permissions:** `app.json`'s `android.blockedPermissions` takes out what Expo's template adds and nothing here uses (`SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`). What's left (read from the release APK with `aapt2 dump permissions`, 2026-11-11) is `INTERNET` and `ACCESS_NETWORK_STATE` (the update check), `VIBRATE` (haptics), expo-audio's `MODIFY_AUDIO_SETTINGS`, and `WAKE_LOCK`, which a library adds. No `AD_ID`, so the Advertising ID answer is no. None needs a declaration form.
- **Package name:** Play registers it with the account by itself (Android developer verification). The iOS bundle ID stays `com.infinitetoken.solitaire`; the two don't have to match.

## Jay's steps, in order

1. **Create the app** (Play Console, Create app): app name `CardTastic: Solitaire & More`, default language English (United States), **Game**, **Free** (a free app can't be made paid later), and the declarations (Developer Program Policies, US export laws).
2. **Fill in App content** (the answers below), the **main store listing** (the text and graphics below) and **store settings**.
3. **Build:** `jrd ship build production`, picking All (iOS and Android together). The first Android build asks to make the upload keystore on EAS: yes. **Done 2026-11-16** (1.2.8, build 4).
4. **Upload the first bundle by hand** in Play Console (Test and release, Production, Create new release, upload the `.aab`, release notes below): Google's API can't create an app's first release, so `eas submit -p android` only works from the second one on, with a Google Cloud service account key that has Play Console access. **Done 2026-11-16** (build 4, so that build can't also be submitted: its version code is used).
5. **Send for review** (Publishing overview). A new account's first app can take several days. Managed publishing holds an approved release until you press Publish, if CardTastic should go live with the iOS release.
6. **After the first upload:** nothing. CardTastic has no sign-in or App Links, so it needs no `assetlinks.json`.

Every later version: `jrd ship build production`, `eas submit -p android --profile production` (the eas-submit service account key is on EAS and works since 2026-11-16; with no `track` in `eas.json`'s `submit.production.android`, it uploads to internal testing), the release notes, then send for review.

## Store listing (main store listing)

**App name** (30 at most, 28 used): `CardTastic: Solitaire & More`

**Short description** (80 at most, 80 used):

> Twenty card games, no ads: classic solitaire plus games for two to four players.

**Full description** (4000 at most, 2,363 used, 1.3.0's with the Daily Deals; the App Store text from `store.config.json` with Android's lines: "one phone or tablet" for "one iPhone or iPad", "on phones and tablets" for "on iPhone and iPad", and no line about profiles coming with you from other Tastic games, since profiles are only shared on iOS and the web; `@tastic/profile`'s shared store isn't available on Android):

```
Twenty card games in one app, with no ads, no sign-in, and no tracking: eleven classic solitaire games, and nine games for two to four players on one phone or tablet.

SOLITAIRE
Klondike, FreeCell, Spider, Pyramid, Yukon, Golf, TriPeaks, Canfield, Scorpion, Forty Thieves, and Aces Up, each with its rules one tap away.
• Tap a card to send it to its best move (Pyramid pairs take two taps), or drag it where you want
• Unlimited undo. Hold Undo to rewind move by move
• Stuck? A hint shows you a move, or turn on Auto Hint
• Auto-Move to the foundations, and a solved board finishes itself
• Rule variants: Draw 1 or Draw 3, Spider with 1, 2, or 4 suits, and more
• Every new deal can be won, except in Spider with 2 or 4 suits

DAILY DEALS
• A Daily Deal in every solitaire game, the same shuffle for everyone, and every one can be won
• Each win is checked by replaying its moves, then ranked on the day's board by score
• Boards show your profile's tag and color, never your name, and only once you say yes
• No sign-in: pick a profile, or name one, and play

BEAT PAR
• Score is moves plus seconds, and lower is better
• Your par is an expert's at first, then follows your own recent wins
• Every win earns a bronze, silver, or gold trophy
• Stats, records, and achievements for every solitaire game
• Fireworks of card suits and a bouncing cascade when you win

PLAY TOGETHER
• RatSlap (Egyptian Ratscrew), Slapjack, Speed, War, Six-Card Golf, and Trash, face to face across the screen
• Gin Rummy, Crazy Eights, and Four Crowns, a rummy whose wild card changes every round, passing the phone between turns
• Crazy Eights and Four Crowns take up to four players, people and computer players in any mix
• Or play against the computer, at Easy, Medium, or Hard in most games
• House rules are settings: jokers in RatSlap, Oklahoma in Gin Rummy, what you draw in Crazy Eights, and more
• Wins and losses for each player, against the computer and each other

MAKE IT YOURS
• Player profiles, each with its own color, settings, stats, and saved games
• Four card faces and four card backs, one with your player tag
• Light and dark mode
• Solitaire in portrait or landscape, on phones and tablets

ALWAYS READY
• Solitaire picks up right where you left off
• Plays offline, all but the Daily Deals

Open source on GitHub: https://github.com/jayrdeaton/CardTastic
```

When the App Store description changes, change this one the same way (the three Android lines above are the only differences).

**Release notes** for the first release (500 at most, 101 used):

```
CardTastic's first release on Android: eleven solitaire games and nine games for two to four players.
```

**Graphics** (in `store/screenshots/google-play/`, gitignored like the App Store's):

- **App icon:** `icon-512.png`, 512 x 512, 32-bit PNG with alpha (opaque), the iOS icon (`assets/images/icon-dark.png`, the four aces on Rose's felt) scaled down: `ffmpeg -i assets/images/icon-dark.png -vf scale=512:512:flags=lanczos -pix_fmt rgba store/screenshots/google-play/icon-512.png`. Google rounds its corners and adds the shadow itself.
- **Feature graphic:** `feature-graphic.png`, 1024 x 500, 24-bit PNG with no alpha: the App Store header's layout at the size Jay approved (2026-11-11), drawn by `node store/creative/build.mjs --only feature` with the app's own components: the four Aces fanned in the middle like the icon, each suit's run from 2 to King arcing out to the edges, every card of the deck once, and pip fireworks of all four suits in the top corners, rendered at 3840 x 1646 and cropped to Play's shape and scaled (`crop=3371:1646:234:0,scale=1024:500:flags=lanczos`, 24-bit). The crop keeps the Aces and the runs leaving them in the middle, and the outer diamond and club Kings run off the edges. No words, no device frame, the Aces in the middle. The App Store header itself is the same layout at 0.76 since 2026-11-12, so no device cuts it (`store/README.md`); Play shows all of its graphic, so this one keeps the full size.
- **Phone screenshots:** `store/screenshots/android/`, eight at 1440 x 2560, no alpha, in upload order, with the alt text in Screenshots below.
- **Tablet screenshots:** none for now (optional).

## Store settings

- **App category:** Game, Card.
- **Tags:** up to five, picked in the console from Play's list. Look for Solitaire, Card, Offline, Single player and Local multiplayer (or whatever the list's nearest names are).
- **Contact details:** email support@infinitetoken.com (public, as PuckTastic's; 2026-11-12), website https://games.infinitetoken.com/cardtastic, no phone.

## App content

- **Privacy policy:** https://games.infinitetoken.com/privacy (it covers Android, and its Game Updates section describes the update check below).
- **App access:** All functionality is available without special access. No account or sign-in exists (the Daily Deals' player is made by the app, with nothing to sign in to).
- **Ads:** No, the app doesn't contain ads.
- **Content rating** (IARC questionnaire): email jay@infinitetoken.com; category **Game**. Violence, fear, sexuality, language, controlled substances and crude humor: none. Gambling: no real or simulated gambling (no game has bets, chips or money; Gin Rummy and Four Crowns keep points only). Users interact or exchange content: no (the two-player games are on one device, with no online play; the Daily boards show a filtered three-character tag and a color, with no chat, names or images). Shares the user's location: no. Digital purchases: no. Unrestricted internet access: no. Expected result: Everyone, PEGI 3. Matches the App Store's answers (`store/README.md`, Age rating, 4+).
- **Target audience and content:** 13-15, 16-17 and 18 and over (Jay, 2026-11-11). Could the store listing unintentionally appeal to children: no (a plain card game, no cartoon characters). Outside the Families policy.
- **News app:** no. **Government app:** no. **Financial features:** none. **Health:** none.
- **Advertising ID:** the app doesn't use one (no `AD_ID` permission, no ads or analytics SDK).
- **Data safety:** below.

## Data safety

Rewritten 2026-11-23 for 1.3.0's Daily Deals. The same inventory as the App Store's App Privacy (`store/README.md`) and the privacy policy. Playing on the phone sends nothing but Expo's update check (expo-updates, at launch: a random installation ID the app makes on its first launch, `EAS-Client-ID`, not the Android ID or the advertising ID, the platform and runtime version, and only after an update failed to start, that update's ID and the first 1,024 characters of its error). The Daily Deals are optional and send the rest, to Tastic-Server (`play.infinitetoken.com`). Expo, AWS and Supabase process it for us as service providers, so nothing counts as shared.

**Does your app collect or share any of the required user data types?** Yes.
**Is all of the user data collected by your app encrypted in transit?** Yes (HTTPS).
**Which account creation methods does your app support?** None that a player sees: no sign-in. The app makes an anonymous player for each profile that plays a Daily Deal.

| Data type | Collected / shared | Processed ephemerally | Required or optional | Purposes | What it is |
|---|---|---|---|---|---|
| Personal info, User IDs | Collected, not shared | No | Optional | App functionality, Account management | The random player ID the server makes for each profile that plays a Daily Deal, and, once the player says yes to the public boards, the profile's tag (filtered) and color |
| App activity, Other actions | Collected, not shared | No | Optional | App functionality | Each Daily Deal started: when, and for a win when it finished, every move (replayed to check it), the time and the score |
| Device or other IDs | Collected, not shared | No (Expo keeps it to count installs per update and roll updates out) | Required | App functionality, Analytics | The update check's installation ID |
| App info and performance, Crash logs | Collected, not shared | No | Required | Analytics | The error from an update that failed to start, so a broken update can be fixed |

Not collected: the profile's name (every player is named "CardTastic" on the server), location, other personal info, financial info, health and fitness, messages, photos and videos, audio, files and docs, calendar, contacts, web browsing, other app info. Profiles, stats, settings and saved games stay on the phone.

- **Can users request deletion?** Yes: in the app (a profile's Edit Profile screen, from Settings' Profile row, under Online, Delete Online Data; deleting the profile does it too) and through the web page under "What Google asks" above, once it exists. The update check's installation ID isn't tied to a person, so uninstalling the app is what removes it.
- **Delete account URL:** https://games.infinitetoken.com/delete-data/cardtastic (live once Games-Web is released with it).

**The App Store's App Privacy answer matches** (`store/README.md`, App Privacy): User ID and Gameplay Content linked to the user, Device ID and Crash Data not, no tracking.

## Screenshots

Eight phone shots (Play's most), retaken 2026-11-25 for 1.3.0: the App Store's nine less RatSlap, with the same captions. Captioned in DejaVu Serif Bold (the app's font) above the capture in a Pixel bezel, on the felt sampled from each capture. The captions and alt text are in `store/google-play-screenshots.json`; paste each shot's `alt` into Play Console (140 at most, all 80 to 130 used). The PNGs and raw captures are gitignored. The 2026-11-11 set was seven shots from before the Daily Deals and the setup screens.

| Shot | Caption | What it shows |
|---|---|---|
| 01-klondike | Classic Solitaire, No Ads / Klondike, FreeCell, Spider, and more | The saved Klondike board after one draw, so Undo is lit |
| 02-home | 20 Card Games in One App / 11 solitaire, 9 to play together | Home as it opens, on the Solitaire tab |
| 03-daily | A Daily Deal for Everyone / Win it and see where you rank | Klondike's setup screen as it opens: the preview, GUEST, DAILY DEAL with today's date, and RANDOM DEAL with Continue, Draw and New Deal |
| 04-win | Beat Par in Every Game / Score is moves plus seconds | The FreeCell finish: a frame 22 s into the recording, silver medal, "3rd best score ever", a chain bouncing and a pip burst |
| 05-ginrummy | Gin Rummy and Crazy Eights / Against friends or the computer | Gin Rummy against a Medium CPU on its second turn: two sets underlined, the 7♦ picked with Throw showing, the CPU's "Took the J♦, threw the Q♣" (the two-player tables hide the status bar) |
| 06-hint | A Hint When You Need One / See a move you can make | Yukon's hint: the see-through 6♣ 5♥ 4♣ between its column and the 7♥, a frame 2.41 s in |
| 07-stats | Stats and Achievements / For every game and rule set | The trophy on Home: the Stats tab with the calendar and Overall (it opens on Everyone, since the emulator has no profiles; the iOS simulators had sibling games' profiles, so iOS opened on Guest with the same numbers) |
| 08-style | Your Cards, Your Colors / Four faces, four backs, any color | Pyramid's fresh deal after one draw, with Decorated faces, the Ornate back and Guest's color #009688 (a red felt) |

The wells and tiles are solid on Android and frosted on iOS while Blur is on (`@tastic/hud`'s `useFrostedWells` never frosts on Android, where auto-paper's `BlurView` needs a blur target the wells don't have), so the same screen's cards read darker grey here than in the App Store set. That frosting is also why a well on iOS takes the felt's hue (a light-mode well over a blue felt measured `#666E9B`, not the opaque `#FFFBFE` surface).

How they were made (2026-11-25), so a reshoot can follow it:

1. `node store/seed/generate.mjs` (writes `store/seed/seed.json`: three weeks of a Hint-following player on the real rules and stats engine, a Klondike board, a Yukon board whose hint moves a clean run, and a FreeCell board one play from its finish).
2. A release APK for the emulator only: `CI=1 npx expo prebuild -p android --clean --no-install`, add `debuggable true` at the top of `android/app/build.gradle`'s `release` block, then in `android/`, `./gradlew app:assembleRelease -PreactNativeArchitectures=arm64-v8a` (3.5 minutes on 2026-11-25). AsyncStorage on Android is reachable only through `adb shell run-as`, which needs a debuggable app. `react-native`'s own release build config stays non-debug, so it still runs the bundled JavaScript, not Metro. **Take the line out afterwards** (`android/` is gitignored, but a local `eas build --local` would use it, and Play refuses a debuggable bundle).
3. The shared `Pixel_9` emulator (`emulator -avd Pixel_9 -no-audio -no-boot-anim -no-snapshot-save`), dark mode (`adb shell cmd uimode night yes`), `adb shell settings put global hide_error_dialogs 1`, the Mac's time zone (`adb shell service call alarm 3 s16 America/Indiana/Indianapolis`, or the seed's days and the emulator's disagree), `adb install -r` the APK, and launch it once so its database exists. **If the emulator is gone** (a disk cleanup deleted both `~/.android/avd` and the SDK's `system-images` on 2026-11-21): the image is `arm64-v8a-36.1_r04.zip` (1.96 GB, sha1 `193d86bad80d9ff79fe4272304f3193e7c097e1e`) from `https://dl.google.com/android/repository/sys-img/google_apis_playstore/`, unzipped into `~/Library/Android/sdk/system-images/android-36.1/google_apis_playstore/` (2.3 GB); the AVD is two hand-written files, `~/.android/avd/Pixel_9.ini` and `Pixel_9.avd/config.ini` (the app-store-prep skill's Play reference has the settings).
4. `python3 store/seed/write-store.py --android` (stops the app, writes the seed into `databases/RKStorage`; `--style '#009688'` for 08). The debuggable build's first launch after seeding takes 20 to 40 s.
5. Demo mode for the status bar (rerun before each capture, another session may reset it). On this image `-e fully true` is needed or Wi-Fi shows "!", and with an empty `datatype` the mobile slot draws nothing, so the bar is the clock, one Wi-Fi icon and the battery, with nothing to paint out:
   ```bash
   adb shell settings put global sysui_demo_allowed 1
   adb shell am broadcast -a com.android.systemui.demo -e command enter
   adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
   adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false -e powersave false
   adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4 -e fully true
   adb shell am broadcast -a com.android.systemui.demo -e command network -e mobile show -e level 4 -e datatype '' -e fully true
   adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
   ```
   Snooze the system notifications a fresh image posts (Safety Center's shield, Play Store's account prompt, the physical keyboard one, the silent group): `adb shell "cmd notification snooze --for 86400000 '<key>'"` with each `key=` from `adb shell dumpsys notification --noredact`.
6. Captures with `adb exec-out screencap -p > store/screenshots/raw/android/<name>.png`, taps with `adb shell input tap <x> <y>` in the 1080x2424 screen's pixels. The win and hint are frames from `adb shell screenrecord --bit-rate 20000000`, pulled and picked with the app-store-prep skill's `frames.mjs` (`sheet`, then `grab`). Every solitaire tile opens its setup screen; Continue opens the saved game.
   - **01-klondike:** Klondike, Continue, tap the stock once.
   - **02-home:** Home as it opens.
   - **03-daily:** Klondike's setup screen as it opens.
   - **04-win:** FreeCell, Continue, record 30 s, tap the J♥ in the second column (the finish plays the rest); pick a frame with a chain and a pip burst in view.
   - **05-ginrummy:** the Two Player tab, Gin Rummy (opponent CPU, Medium), Ready. Back and Ready deal a fresh hand while no card has moved; deal until the hand shows two meld lines, take the upcard, throw a deadwood card, let the CPU play, draw from the stock and tap a deadwood card so it rises with Throw showing (the discard then has the CPU's card on it, not an empty slot).
   - **06-hint:** Yukon, Continue, record 8 s, press Hint.
   - **07-stats:** the trophy on Home.
   - **08-style:** reseed with `--style '#009688'`, Pyramid, New Deal, tap the stock once.
7. `~/.claude/skills/app-store-prep/scripts/compose.mjs store/google-play-screenshots.json` writes `store/screenshots/android/`.

## First run on Android (2026-11-11)

The first time CardTastic ran on Android: a local release APK (`com.infinitetoken.cardtastic`, arm64) on the Pixel_9 emulator (Android 16), in dark mode with sound off. Not a device, not the EAS production build.

- **Worked:** a cold start in 0.84 s to How to Play over Home, with no JavaScript errors in the log; the adaptive icon on the launcher; Home on both tabs; a saved Klondike, FreeCell and Yukon board resuming; a stock draw; FreeCell's solved-board finish into the win card, the bouncing cascade and pip fireworks; the silver medal's masked gradient on the trophy and title (never seen natively before: it renders); Yukon's hint glow and glide; the stats screen with its calendar, and the Achievements tab; Gin Rummy's setup screen and its table against the CPU (melds marked, suit marks under the ranks); Pyramid with another player color, card faces and back.
- **The Achievements tab's label was cut to "Achievem…"** on the Pixel 9 (411dp wide): the three tabs were equal-width segments. Fixed in `@tastic/shell` 0.8.2 (label-wide segments on iOS and Android); the 2026-11-25 Stats shot shows it whole.
- **expo-audio keeps an active media session per sound player** (`dumpsys media_session`: several `ExpoAudioBasicMediaSession` entries for the app, `active=true`). With sound off nothing showed in the notification shade, but with sound on a card click may put CardTastic in Android's media controls or take the media buttons. The emulator has no audio, so this needs a device with sound on.
- **Not checked:** the hardware and gesture back on every screen (the skill's warning: back from a screen pushed with `router.replace` quits the app), landscape, the two-player games' portrait hold, a tablet, haptics, a device.
- **The screenshot seed was scrambling every saved game's foundations** (iOS too): `store/seed/write-store.py` didn't stamp `foundationLayout`, so the app took each seeded save for one from before 2026-10-20 and moved its foundations, hearts landing in the spades slot (and a tap played into a column instead of up). Fixed 2026-11-11; the App Store set was taken before the layout changed, so it wasn't affected, but its retake would have been.
