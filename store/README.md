# App Store

Everything the iOS listing needs. The text lives in `store.config.json` (repo root), which `eas metadata:push` sends to App Store Connect. The rest is set by hand in App Store Connect once and carries over to later versions.

## Pushed by EAS Metadata (`store.config.json`)

Title, subtitle, promotional text, description, keywords, marketing/support/privacy URLs, copyright and categories (Games > Card, Casual). Not the age rating: eas-cli (27.5.0 on 2026-11-08) can't send Apple's Social Media answer, which Apple requires since September 2026, so a push with the age rating in it fails on "You must provide a value for the attribute 'socialMedia'". It's set by hand (below).

```bash
eas metadata:lint
```

```bash
eas metadata:push
```

`push` needs the app record to exist in App Store Connect and edits its editable version, setting its number to `store.config.json`'s `apple.version`. Keep that equal to `app.json`'s `expo.version` and bump both together: without it, push sends no version number and Apple refuses the version step (copyright, promo text, description, keywords, support and marketing URLs) while the rest goes through. The first `eas submit` creates the record (named by `eas.json`'s `submit.production.ios.appName`) when you sign in with your Apple ID. Apple's API can't create apps, so with an API key create it first: My Apps > + > New App, bundle ID `com.infinitetoken.solitaire`, primary language English (U.S.). The record exists: it was created as SolitaireTastic for 1.2.5. **"CardTastic" alone is taken** (2026-11-08: the push failed with "The app name you entered is already being used", though no app by that name shows in an App Store search, so it's another developer's unreleased record), so the store name is "CardTastic: Solitaire & More" and the label under the icon (`app.json`'s `expo.name`) stays CardTastic. Apple only says a name is taken when it's saved, and saves the name, subtitle and privacy URL in one step, so a taken name holds back all three; the version's own text still goes. Push edits the version that is still editable. 1.2.5 was submitted for a manual release and never went live: if it's sitting in Pending Developer Release, cancel that release first (the version becomes editable again and push renumbers it to `apple.version`).

Limits: title 30, subtitle 30, promotional text 170 (editable any time without review), description 4000, keywords 100 in total with the commas. Keywords don't repeat words already in the title or subtitle ("solitaire" is indexed from the title, "ad", "free", "card" and "games" from the subtitle; "CardTastic" is one word, so it does NOT match a search for "card" or "cards" on its own). 1.3.0 swapped "speed" for "daily" (2026-11-23), so "daily solitaire" matches with the title; "speed" alone mostly matched speed tests and racing games.

`releaseNotes` (What's New) is left out while no version has gone live (none had on 2026-11-23: the iTunes lookup for `com.infinitetoken.solitaire` still found nothing, so 1.3.0 is still the first). Add it to `info.en-US` for every version after the first one released.

## Screenshots (uploaded by hand)

`store/screenshots/iphone-medium/` (1206x2622) goes in the "iPhone 6.1" or 6.3" displays" slot, which App Store Connect requires (a 1320x2868 file there fails with "File dimensions are invalid"). `store/screenshots/iphone/` (1320x2868) is for the optional 6.9" slot, and `store/screenshots/ipad/` (2064x2752) for the 13" iPad slot. Apple scales these to every smaller device. The iPad set is required because `ios.supportsTablet` is on. The order in the folder is the upload order; the first three are what search results show.

The PNGs are build output and are gitignored, along with the raw captures they were made from (`store/screenshots/raw/`). The captions are in `store/screenshots.json`.

How they were made (2026-10-17, all retaken 2026-10-19 on 1.2.4, and again 2026-11-11 for CardTastic: eight shots, two of them two-player games, from a Release build of the working tree that day): a Release build on the iPhone 17 Pro Max and iPad Pro 13" (M5) simulators, status bar pinned to 9:41 with full battery, dark appearance. The saved data was written before first launch (sound off, guide seen, three weeks of stats from a Hint-following player on the real rules and stats engine, the recent wins their personal par is made from, and saved boards for Klondike, Yukon and a FreeCell one play from its finish), so every number on screen is one the app produced. The hint and win shots are frames from a screen recording. A compositor puts each capture under its caption in DejaVu Serif Bold, on the felt color sampled from the capture. The tools (simulator setup, the slim build, frame picking, the compositor) are in Jay's `app-store-prep` skill; the Solitaire-specific seeding is here in `store/seed/`.

To redo them:

1. `node store/seed/generate.mjs` (writes `store/seed/seed.json`, gitignored)
2. Build and install a Release copy on the `AppStore iPhone 6.9` and `AppStore iPad 13` simulators (the skill's `sim-build.sh` and `sim-setup.sh --app`)
3. `store/seed/reseed.sh <udid>` on each, then capture into `store/screenshots/raw/<device>/<name>.png`:
   - **01-klondike:** open Klondike (the saved board), draw one card so Undo lights up
   - **02-home:** Home as it opens, on the Solitaire tab
   - **03-win:** open FreeCell, record, tap the J♥ in the second column (the auto-finish plays the rest); use a frame once every card chain is mid-bounce (10 to 25 s in), not the start, with a pip burst in view (iPhone 16 s, iPad 15 s on 2026-11-11)
   - **04-ratslap:** the Two Player tab, RatSlap, set the opponent to Player, tap both Ready buttons, then play from each deck until a face card's challenge is under way with three cards fanned on the pile ("K · 1 try left"). The game hides the status bar, so this capture (and Gin's) has none, as in the app
   - **05-ginrummy:** Gin Rummy, set the opponent back to CPU, Medium (the opponent pick is shared by every two-player game), Ready. Play until the hand shows a meld or two with their lines (going Home and back deals a fresh hand), then tap a deadwood card so it rises with Throw showing
   - **06-hint:** open Yukon, record, press Hint; use the frame where the see-through 6♣ 5♥ 4♣ is halfway to the 7♥
   - **07-stats:** (02-home and 07-stats were taken 2026-11-11 with `@tastic/shell` 0.8.2's fix for its tabs swapped into the simulator build: label-wide Stats | Records | Achievements, and no line across "Two Player" or "Achievements". Any build on 0.8.2 or later matches them.) The trophy on Home, then switch the player picker from Guest to Everyone: the seeded history is in the phone's totals, and Guest's own record only has that day's FreeCell win. The Stats tab as it opens, the calendar and Overall in view
   - **08-style:** `store/seed/reseed.sh <udid> --style '#009688'`, open Pyramid (a fresh deal), draw one card
4. The skill's `compose.mjs store/screenshots.json`

## Header and search results art (uploaded by hand, optional, iOS 27+)

`store/screenshots/header.png` (3840 x 1646) and `store/screenshots/search.png` (3840 x 2560), gitignored like the screenshots. `node store/creative/build.mjs` draws both with the app's own components at full size (react-native-web, like the face bitmaps), in the default player's colors in dark mode:

- **Header (redrawn 2026-11-11, Jay: show all the suits, not one card repeated):** the whole deck, every card once. The four Aces fanned in the middle like the app icon (spades, diamonds, clubs, hearts, the foundations' order), and out of each Ace its suit's run, 2 up to King, in one arc to the edge: the inner Aces' runs (diamonds, clubs) high and wide, the outer Aces' (spades, hearts) low, so no two runs cross, and every corner index stays clear of the next card. Pip fireworks of all four suits in the top corners. No words: the app's name sits right under it. The first header (Home's fan of backs with one King repeated along each trail) is gone. **Drawn at 0.76 of the approved size since 2026-11-12:** App Store Connect's Device Preview cuts the iPhone's sides (x 308-3532) and iPad landscape's top and bottom (y 168-1314), so at full size the iPhone lost the diamond and club Kings and iPad landscape showed only the tops of the spade and heart Kings. Every card is now in y 213-1267 and x 509-3331, and the fireworks sit in the pockets above the inner runs' ends. Google Play's feature graphic keeps the approved layout at full size (`store/google-play.md`).
- **Search results:** "20 Classic Card Games" at 230px across the top over "No ads. Plays offline.", and under it four games fanned out in phones running off the bottom, on the app's felt: Klondike, Gin Rummy against the CPU, a FreeCell win and Pyramid on the red felt (`store/screenshots/raw/iphone/01-klondike.png`, `05-ginrummy.png`, `03-win.png`, `08-style.png`, so take the screenshots first). **Redrawn 2026-11-13** to fill the card: the store shows the whole 3:2 on iPhone, not the top strip App Store Connect's preview showed, and the 2026-11-11 version, kept to that strip and the template's middle, read as mostly empty in the store.

Each comes with `-safe.png` (the safe area outlined in yellow: for search, the card's 200px margin) and `-384.png` (about a search card's size on a phone). They are rendered through the app-store-prep skill's `creative.mjs`, which checks the size and strips any alpha channel.

Upload in the version's Product Page Information > Header and Search Results (Header, then Search Results), then check both with Preview. The header has no words, so it can go on every localization; the search image's words are English, so it goes on English only. They're reviewed with the version, or on their own through Asset Library.

## Set by hand in App Store Connect

**App Privacy** (rewritten 2026-11-23 for the Daily Deals, which 1.3.0 is the first build to have): "Yes, we collect data from this app". Playing on the device sends nothing but Expo's update check. The Daily Deals are optional and send the rest, from the moment a profile starts its first one. No tracking, so no App Tracking Transparency prompt. This is the same inventory as Google Play's Data safety (`store/google-play.md`) and the privacy policy's "Daily Leaderboards in CardTastic" section (https://games.infinitetoken.com/privacy), which App Review compares with these answers.

| Apple's data type | What it is | Purposes | Linked to the user | Tracking |
| --- | --- | --- | --- | --- |
| Identifiers, User ID | The random player ID the server makes for each profile that plays a Daily Deal; and, only once the player says yes to the public boards, the profile's tag (one emoji or up to three characters, checked against a list of offensive words) and color, shown on the boards | App Functionality | Yes | No |
| User Content, Gameplay Content | Each Daily Deal a profile starts: when it started and, for a win, when it finished, every move (the server replays them to check the win), the time and the score | App Functionality | Yes | No |
| Identifiers, Device ID | The random installation ID (`EAS-Client-ID`) Expo's update check sends at launch: not the advertising identifier, and not tied to a player | App Functionality, Analytics (Expo counts installs per update) | No | No |
| Diagnostics, Crash Data | Only after an update failed to start: that update's ID and the first 1,024 characters of its error, sent with the next update check | App Functionality | No | No |

Not collected: the profile's name (every player is named "CardTastic" on the server, `src/stores/online.ts`), contact info, location, purchases, usage data, or anything else. Profiles, stats, records, achievements, settings and saved games stay on the device. Where it goes: the game server `play.infinitetoken.com` (Tastic-Server on AWS Elastic Beanstalk, its database on Supabase, both in the US) and Expo's update service. Client addresses are used in memory for rate limiting and not stored. The label then reads "Data Linked to You: Identifiers, User Content" and "Data Not Linked to You: Identifiers, Diagnostics". Through 1.2.8 it was Device ID and Crash Data only (Jay, 2026-11-11), and Data Not Collected through 1.2.5. Revisit it with the policy if analytics, crash reporting, ads, chat or online play are added.

**Account deletion (guideline 5.1.1(v)):** there is no sign-in, but each profile that plays a Daily Deal gets an anonymous player on the server, so the app deletes it: each profile's Edit Profile screen (Settings, then the Profile row; or Profiles and the profile), under Online, Delete Online Data, shown once that profile has played a Daily. It deletes that profile's player and every Daily result it posted, and the profile stays. Deleting the profile deletes its player too. The review notes say where it is.

**Age rating:** every content question None (Simulated Gambling None: no game has bets, chips or money, and Gin Rummy and Four Crowns keep points only; Contests None: the Daily boards rank wins, with no prize, entry or sign-up), and Messaging and Chat, User-Generated Content, Social Media, Unrestricted Web Access, Advertising, Gambling, Loot Boxes, Parental Controls, Age Assurance and Health or Wellness all No, so 4+. User-Generated Content is No because the only thing a player puts in front of others is a tag of up to three characters or one emoji, filtered by the server, and a color, on the Daily boards and only after saying yes: no names, free text, images or chat. Guideline 1.2 asks apps with user content for a filter, a way to report, a way to block and published contact details; CardTastic has the filter and the contact details. If App Review counts the tags as user content, the fix is a way to report a tag on a board and the server hiding it. Set by hand in App Information > Age Rating until eas-cli can send the Social Media answer; 1.2.5's answers carry over, but Apple may ask the newer questions before the next submission. Check the rating App Store Connect works out.

**App Review Information:** sign-in not required. Contact: name, email and phone (the phone stays out of `store.config.json`, which is public). Notes (rewritten 2026-11-23 for the Daily Deals):

> No account or sign-in is needed, and there are no in-app purchases or ads.
>
> This app was declined under guideline 4.3 as SolitaireTastic, together with LightCyclesTastic and SnakeTastic, as too similar to our other apps. Following that feedback, we combined our games into a few apps with more in each: this one grew from solitaire alone into twenty card games, eleven solitaire and nine for two players, and LightCycles and Snake are now games inside one app, DuelTastic, submitted separately.
>
> Home has two tabs. Solitaire holds eleven one-player games. Two Player holds nine games played against the computer or with other people on the same device: RatSlap, Slapjack, Speed, War, Six-Card Golf and Trash with two people face to face across the screen, and Gin Rummy, Crazy Eights and Four Crowns passing the device between turns (Crazy Eights and Four Crowns take up to four players). Tap a two-player game, leave the opponent as the computer, and tap Ready to play alone.
>
> New in this version: Daily Deals. Each solitaire game opens on a setup screen with Today's Deal: one deal a day, the same for everyone, timed and checked by our game server (play.infinitetoken.com), which replays each win's moves and ranks it on Today's Board. Tap Today's Deal to play it, or Today's Board to see the day's winners without playing. As Guest, either one first asks for a name, which makes a player profile on the device; the name never leaves the device. Hint is off in a Daily Deal, and the server keeps its time from the moment it starts, so the clock keeps running while the app is closed. After a profile's first Daily win, the app asks whether to show its wins on the public boards (Keep Private or Show My Wins). The boards show only a profile's tag (one emoji or up to three characters, checked against a list of offensive words) and color, never a name. Under Random Deal, New Deal plays an ordinary game on the device.
>
> Each profile that plays a Daily Deal gets an anonymous player on our server. To delete it: open Settings with the gear on Home or on a game's setup screen, tap the Profile row to open that profile's Edit Profile screen, and under Online, tap Delete Online Data (it shows once the profile has played a Daily Deal). It deletes that player and every result it posted. Deleting the profile deletes it too.
>
> The solitaire games turn with the device. The two-player games stay in portrait on iPhone, since two people sit at either end of the phone.
>
> Player profiles are shared through an App Group with other Tastic games by the same developer, if any are installed. Apart from the Daily Deals, nothing leaves the device but the update check.
>
> On first launch a three-card How to Play guide appears, and each two-player game has its own the first time it's opened. Tap Skip to go straight to the game.

**Content Rights:** yes, the app contains third-party content, and the rights are covered: the card artwork is based on SVG-cards by David Bellot and Huub de Beer (LGPL-2.1, credited in Settings), and the card font is DejaVu Serif (Bitstream Vera license).

**License Agreement:** Apple's standard EULA (the default). A custom one only matters for subscriptions, accounts or user content, none of which this app has.

**Pricing and Availability:** Free (0.00 USD base price), 173 countries or regions: every one except China mainland (needs a government game approval number) and Vietnam (needs a game license from a local company). Apple Silicon Mac and Apple Vision Pro availability unticked: the app has never been run on a Mac (untested window sizing and touch tables), and Apple marks 1.2.5 as not compatible with Vision Pro. Distribution method Public. Tax category left at the default. No In-App Purchases, Subscriptions, App Store Server Notifications, Game Center or Growth & Marketing items; Age Suitability URL, User Privacy Choices URL and Accessibility URL left blank.

**Export compliance:** already answered by `ITSAppUsesNonExemptEncryption: false` in `app.json`, so App Store Connect doesn't ask.

**Accessibility (optional):** Dark Interface claimed for iPhone and iPad (1.2.5). Nothing else until each feature has been checked on a device; Reduced Motion needs the app to follow the system Reduce Motion setting first. Apple asks per feature (VoiceOver, Larger Text, Dark Interface, Reduced Motion and so on), and a claim that doesn't hold up is worse than none.

**Version release:** automatic after approval (Jay, 2026-11-12: nothing to wait for; 1.2.8 submitted that day with PuckTastic and DuelTastic). 1.2.5 was manual, so SolitaireTastic, LightCycles and Snake would go live together.

## Shipping a version

1.3.0, the Daily Deals (2026-11-23, Jay: submitted fresh as 1.3.0). The 1.2.8 review (build 24, submitted 2026-11-12) sat in the queue for 11 days and Jay cancelled it, so that version is editable again and `eas metadata:push` renumbers it to 1.3.0. `app.json` is already 1.3.0 (`jrd ship release minor`, 2026-11-17), so no release bump comes first. The `v1.3.0` tag, and the web deploy it set off on 2026-11-17, predate the Daily Deals: the 1.3.0 store builds come from main, ahead of the tag.

1. `npm run verify`
2. Commit
3. `jrd ship build production` (iOS and Android together; the Daily Deals need a new native build, for `expo-secure-store` and `@tastic/profile`; a local build needs `npx expo prebuild --clean` first, since `ios/` is still `Solitaire.xcodeproj`)
4. `eas submit -p ios --profile production` (uploads the build to TestFlight). Play a Daily Deal on the TestFlight build before sending it: start one, win it, answer the first-win question, open Today's Board, and Delete Online Data from Edit Profile.
5. `eas metadata:push` (renumbers the cancelled 1.2.8 version to 1.3.0, and sends the "daily" keyword)
6. Upload the screenshots, and the header and search art, if they changed (not for 1.3.0: Jay kept the 2026-11-11 set, which still shows Home's old GUEST button and a Home button where each game now has a back arrow, and no Daily Deal)
7. Release Games-Web before Add for Review: its privacy policy fix for the Daily Deals (df7983d, 2026-11-23: no name sent, the tag and color only once shown on the boards, deleting from Edit Profile) was committed but not pushed, and the live policy still says the server keeps a profile's name, which the App Privacy answers above say it doesn't
8. In App Store Connect: App Privacy (the new answers above: add User ID and Gameplay Content, both linked, App Functionality), the age rating (Contests None, User-Generated Content No), the review notes above, pick the new build in place of build 24, and Add for Review

Every later release: `jrd ship release` bumps `package.json` and `app.json` but not `store.config.json`, so set `apple.version` to match by hand.
