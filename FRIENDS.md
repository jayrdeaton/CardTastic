# Friends across the Tastic games: the plan

Approved by Jay on 2026-11-25, with every choice under Decisions at the end. Nothing here is built yet. It builds on HexFleet's
`ONLINE.md` (`~/Developer/HexFleet/ONLINE.md`), whose section 9 made each profile a player online, and on Tastic-Server
(`~/Developer/Tastic-Server`).

## What it is

- **A profile has friends, the same ones in every Tastic game,** like a console's friends list (Jay, 2026-11-25: "All your friends
  are available in all your games"). Kid's friends are Kid's, not Dad's.
- **You add someone once,** with a code or link one of you sent the other. There's no search and no public directory, so nobody
  can find a profile they weren't given a code for.
- **Friends see each other's names.** Strangers still see only a tag and color, as on the Daily boards today.
- **What friends are for:**
  - HexFleet: "Invite Steve" from New Match, one tap and a push, with no code to send.
  - CardTastic: a Friends tab on Today's Board, and later on the par board.
  - Any other game: whatever it wants from the list.
- **Not in this:** chat, presence ("Steve is playing CardTastic"), search, friend suggestions, sign-in. The design leaves room for
  presence.

## 1. One player per profile, for every game

Today each profile has a player per game, and on purpose the server can't tell that a profile's HexFleet player and its
CardTastic player are the same person (`ONLINE.md` section 9). Friends that follow you between games need one identity, so:

- **Each profile has one player on Tastic-Server, used by every game.** The server's `players` table already has no game in it:
  the split per game is only in `@tastic/profile/online`, which keeps a player per game under `<game>.online.player.<profileId>`.
- **What stays per game moves off the player:**
  - **Push tokens:** each app has its own Expo push token, so a player has one per game (`push_tokens`: player, game, token).
    A HexFleet push goes to HexFleet's token. `PUT /push-token` already names every player on the device; it gains the game.
  - **A game's own settings for a player:** CardTastic's `listed` and the tag and color shown on its boards (`player_games`:
    player, game, listed, tag, color).
- **Unchanged:** the version gate (every request still names its game and rules version), each game's own calls (HexFleet's
  matches, CardTastic's Daily runs), and the server never getting a profile's id, an email or a device id.
- **Deleting has two levels,** both on the profile's Edit Profile screen in every game:
  - **Delete [Game] Data:** that game's matches or runs and its push token. The player and its friends stay.
  - **Delete Online Account:** the player, its friends and every game's data, as `DELETE /players/me` and the admin script
    already do across games. Apple requires this one in each app (guideline 5.1.1(v)).

## 2. Sharing the player between games on one device

- **iPhone and iPad:** each app keeps a player's key in its own Keychain items today. They move to a Keychain access group every
  Tastic app shares (the `keychain-access-groups` entitlement, and expo-secure-store's `accessGroup` option), so every game on
  the phone finds the same player for a profile, the way they already find the same roster through the App Group. The
  entitlement is native: one new build of each app that goes online.
- **Web:** every game is served from `games.infinitetoken.com` and already shares its storage, so the keys just drop the game
  from their names.
- **Android:** apps can't share storage. There's no App Group, `sharedUserId` is deprecated, and a content provider would need
  every app signed with one key, which Play App Signing doesn't do by default. Each game there has its own roster and would make
  its own player, so a profile is joined across games with a link code (section 3).

## 3. Link codes: another game on Android, another device

- **Making one:** a profile's ONLINE section has Use on Another Device, which shows a short code, good once and for 10 minutes.
- **Using one:** Have a Code? on Edit Profile in the other game or device. That profile takes over the player: its key, name
  and friends.
- **What it covers:** a second Tastic game on Android, a new phone, a browser, a reinstall while the old device is still around.
  Not a lost phone: with no sign-in, nothing can bring a player back from nowhere. Section 9 called this "a one-time transfer
  code, not planned"; friends make it worth building.
- **A code is the whole account,** so it's short-lived, single-use, shown only on the profile's own screen, and rate limited like
  invite lookups.
- **Still opt-in:** a phone and a browser can stay two different players, so playing your phone against your computer (section 9)
  still works.

## 4. Making friends

- **Add Friend** on the Friends screen. Share sends "Jay wants to be friends in the Tastic games", a link and the code.
- **The link names the game it was sent from,** `games.infinitetoken.com/<game>/friend/K7Q2PX`, so it opens that game where it's
  installed (no two apps claiming one link), and the code works in any Tastic game.
- **Friend codes are one-time and last 7 days** (`friend_invites`: code, player, expires_at), apart from match invite codes.
- **Have a Code?** on the Friends screen, with HexFleet's Paste button, takes a code or a whole link.
- **Redeeming makes both friends at once,** and the sender gets a push: "Steve is now your friend." The profile adding is the one
  whose Friends screen it was opened from. A link opened from outside asks who's adding, or makes a profile from a typed name, as
  the Daily's Who's Playing? does.
- **The friend page on Games-Web** is the invite page's twin: the code in big letters, Copy, the store buttons for the game it came
  from, and "Works in any Tastic game."
- **Removing a friend** is on the Friends screen, behind a confirm, both ways and without a push. It's also the block: nobody can
  add you again without a new code from you.
- **Limits:** a cap on friends per player, and friend codes rate limited like invites.

## 5. Names

- **Friends see the profile's name,** kept up to date with renames (`sync` already renames players). HexFleet already sends the
  name. CardTastic sends "CardTastic" today (`nameOf`) and would send the name too, since only friends see it.
- **Strangers see what they do now:** tag and color, on public boards only.
- **Two friends called Jay** are told apart by their tag and color.

## 6. What each game does with friends

- **Every game:** a Friends row in the profile's ONLINE section (the package's), opening the Friends screen: friends with their
  chips, Add Friend, Have a Code? and remove.
- **HexFleet:** New Match lists your friends. "Invite Steve" makes the match with a seat waiting for Steve's player and pushes
  him: "Jay invited you to HexFleet." It shows in Steve's Your Matches to join with one tap. Codes and links stay for people who
  aren't friends yet. The server only takes an invite addressed to a friend.
- **CardTastic:** Today's Board gets Everyone | Friends. Friends shows each friend's result today with their name, ranked among
  your friends. The par board (planned separately) gets the same tab.
- **Later:** a HexFleet invite reaching a friend who doesn't have HexFleet, through a Tastic game they do have, with a link to
  install it. And after a HexFleet match with someone who joined by code, "Add Steve as a friend" on the result.

## 7. Privacy and the stores

- **This reverses a section 9 decision:** the server would know that one person plays several Tastic games, and section 9's
  "nothing links a person across apps" (part of why "no tracking" holds) stops being true. It isn't tracking in Apple's sense,
  which is linking with other companies' apps or data, so "no tracking" still holds and there's no tracking prompt. But the
  wording changes: Games-Web's terms and privacy policy, each app's App Privacy and Data safety answers, and the review notes.
- **User-generated content (1.2):** names only reach friends you chose, removing a friend is the block, and there's no search or
  chat. `ONLINE.md` section 7 asked a public release for a name filter and a block, and friends-only names with removal cover the
  block. Reporting a tag on the public boards is still open, apart from this.
- **Kids:** nobody can find a profile without a code from someone who has it, and on a family phone the parent is the one
  sharing it.

## 8. Build order

1. **Tastic-Server:** push tokens and settings per game, one player for every game, friends and friend codes, link codes,
   invites addressed to a friend, and the friends board query, with tests. Today's players are deleted as it ships (Decision 1).
2. **`@tastic/profile/online`:** one player per profile for every game (the Keychain access group on iOS, shared keys on the
   web), link codes, the Friends screen, and the two deletes.
3. **A native build of each app that goes online** (HexFleet, CardTastic) for the entitlement, which you run.
4. **HexFleet:** Invite a friend from New Match.
5. **CardTastic:** names for friends and the Friends tab on Today's Board.
6. **Games-Web:** the friend page and the friend paths in both `.well-known` files.
7. **The wording:** the sites, the privacy policy, and each store's privacy answers.

## Decisions

Decided by Jay on 2026-11-25:

1. **The players that exist now start over.** Each profile that has played has a HexFleet player and a CardTastic player today.
   With the change, every player is made again as one per profile for every game: HexFleet's open matches and CardTastic's Daily
   history go, and nothing merges the old players. Delete the old ones from the server as the change ships, so nobody keeps
   showing on today's boards from a player no app holds a key for.
2. **Friend codes are one-time and good for 7 days,** not one standing code per profile. A standing code is easier to hand out
   but works for anyone who ever sees it.
3. **Friends see your Daily results even when you're not on the public boards.** Friends are people you chose, and Show on
   Public Boards stays about strangers.
4. **Link codes are built now, with the rest.** Without them a profile on Android is a different player in each game, so friends
   added in HexFleet wouldn't be in CardTastic there.
5. **The friend link is under the game it was sent from** (`/<game>/friend/<code>`), not one link for every game, which iOS and
   Android would each have to pick an app for.
6. **A player can have up to 200 friends,** well past a family and its friends, and short of anything a script could fill.
