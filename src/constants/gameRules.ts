// Short "how to play" bullets per game, shown by RulesDialog (see GameChrome's rules icon).
// Kept in sync with each game's own rules.ts by hand - these describe what's actually implemented
// (e.g. Golf/TriPeaks' rank adjacency doesn't wrap Ace-King, Yukon's move rule doesn't require a
// valid run), not generic solitaire rules that might not match this app's specific variant.

export const KLONDIKE_RULES: string[] = ['Build tableau columns down in alternating colors.', "Move a face-up run together if it's a valid descending, alternating-color sequence.", 'Only a King can start an empty column.', 'Send cards to the foundations by suit, Ace up to King, to win.', 'Draw from the stock onto the waste (1 or 3 at a time, per your draw setting); the waste turns back into the stock each time it runs out.']

export const SPIDER_RULES: string[] = ['Build tableau columns down regardless of suit.', 'Only a same-suit descending run can be picked up and moved together.', 'A complete King-to-Ace run of one suit clears itself automatically.', "Deal a new row onto every column from the stock when you're stuck. Every column needs at least one card first, unless fewer cards are left on the table than there are columns.", 'Clear all 8 runs to win.']

export const FREECELL_RULES: string[] = ['All 8 tableau columns are dealt face-up, with no stock and no hidden cards.', 'Build tableau columns down in alternating colors.', 'Move several cards at once if you have enough empty freecells and empty columns to support the move.', 'Each of the 4 freecells holds one card temporarily.', 'Send cards to the foundations by suit, Ace up to King, to win.']

export const YUKON_RULES: string[] = ['Build tableau columns down in alternating colors.', "Pick up any face-up card and everything sitting on it as one group, even if that group isn't itself a valid sequence. It just has to land on a card one rank higher in the opposite color.", 'Any face-up card can start an empty column, not just a King.', 'There is no stock. Every card is in play from the start.', 'Send cards to the foundations by suit, Ace up to King, to win.']

export const CANFIELD_RULES: string[] = ['Foundations start at whatever rank the deck happens to cut to (not always Ace) and wrap King back around to Ace as you build up.', 'Build tableau columns down in alternating colors. Runs wrap from Ace down to King here, unlike the other games.', 'An empty tableau column can only be refilled from the reserve pile while it still has cards; once the reserve is empty, any card can fill it.', "Draw from the stock onto the waste (1 or 3 at a time, per your draw setting) when you're stuck; the waste turns back into the stock each time it runs out.", 'Fill all 4 foundations all the way around to win.']

export const PYRAMID_RULES: string[] = ['28 cards are dealt face-up in a 7-row triangle.', 'Pair up two exposed cards that add up to 13 (Ace = 1 ... King = 13) to remove them both.', 'A lone King already equals 13 and can be removed by itself.', 'A card is exposed once both cards resting on it below are gone.', 'Draw from the stock to the waste for more options; it recycles once it runs out.', 'Clear the whole triangle to win.']

export const GOLF_RULES: string[] = ['7 tableau columns of 5 face-up cards each.', "Play a tableau card onto the waste pile if it's exactly one rank higher or lower than the waste's top card. Suit doesn't matter. Ace and King only wrap if your rank-wrap setting is on.", "Draw from the stock when you're stuck. It does not recycle once empty.", 'Clear every tableau column to win.']

export const TRIPEAKS_RULES: string[] = ['28 cards are dealt face-up across three overlapping peaks.', "Play an exposed card onto the waste pile if it's exactly one rank higher or lower than the waste's top card. Suit doesn't matter. Ace and King only wrap if your rank-wrap setting is on.", "Draw from the stock when you're stuck. It does not recycle once empty.", 'Clear all three peaks to win.']

export const SCORPION_RULES: string[] = ['7 tableau columns: the first 4 have 3 face-down cards under 4 face-up; the last 3 are all face-up.', 'Pick up any face-up card and everything sitting on it as one group, even if that group isn’t itself a valid sequence. It just has to land on a card of the same suit, one rank higher.', 'Any face-up card can start an empty column.', 'With the assisted-stock setting on, deal 3 held-back cards onto the last 3 columns once, whenever you like.', 'Win by forming all 4 suits into complete King-to-Ace runs.']

export const FORTYTHIEVES_RULES: string[] = ['Two decks: 10 tableau columns of 4 face-up cards each (the 40 in the name).', 'Build tableau columns down by suit. One card at a time, unless your run-move setting is on.', 'An empty tableau column can be filled with any single card.', "Draw from the stock onto the waste when you're stuck. It does not recycle once empty.", 'Fill all 8 foundations by suit, Ace up to King, to win.']

export const ACESUP_RULES: string[] = ['All 52 cards deal out across 4 piles, one card at a time, as the stock allows.', 'Aces rank highest. Discard a pile’s top card if another pile’s top card is the same suit and higher.', 'Move a pile’s top card onto an empty pile. That’s the only other move.', 'Deal another round onto all 4 piles from the stock whenever you like.', 'Win by discarding everything but the 4 Aces once the stock runs out.']

// RatSlap's own: a two-player game (games/ratslap/engine/rules.ts), so no Scoring paragraph under it.
export const RATSLAP_RULES: string[] = ['Also called Egyptian Ratscrew. Each player starts with half the deck, face down.', 'Take turns tapping your deck to play your top card onto the pile.', 'A Jack, Queen, King or Ace gives the other player 1, 2, 3 or 4 tries to play one of their own. If none comes up, whoever played it wins the pile.', 'Slap the pile when the top two cards match (a double) or the top card matches the one two below it (a sandwich): tap anywhere on your side of the table. A good slap wins the pile, even mid-challenge.', 'A wrong slap burns your top card: it goes face up under the pile, to whoever wins it.', 'With the jokers in, a joker cancels a face-card challenge.', 'Out of cards, you can still slap back in. Win by taking every card.']

// Slapjack's: RatSlap's table under simpler rules (games/ratslap/engine/rules.ts, SLAPJACK_RULESET), no Scoring paragraph.
export const SLAPJACK_RULES: string[] = ['Each player starts with half the deck, face down.', 'Take turns tapping your deck to play your top card onto the pile.', 'When a Jack lands on top, slap the pile: tap anywhere on your side of the table. The first good slap wins the pile, which goes under your deck.', 'A wrong slap burns your top card: it goes face up under the pile, to whoever wins it.', 'Out of cards, you can still slap back in on the next Jack. Win by taking every card.']

// Six-Card Golf's (games/sixcardgolf/engine/rules.ts): a two-player game scored by its own points, so no Scoring paragraph.
export const SIX_CARD_GOLF_RULES: string[] = ['Each player has six cards face down in two rows of three, and turns two of them face up to start.', 'On your turn, draw the top card of the stock or take the top card of the discard. Swap it for any one of your six, which goes face up on the discard. A card drawn from the stock can be discarded instead.', 'Once one player’s six cards are all face up, the other player has one last turn. Then every card turns over and the hole is scored.', 'Ace 1, 2 minus 2, 3 to 10 their number, Jack and Queen 10, King 0. Two of a rank in a column, one above the other, score 0.', 'The lowest total after the last hole wins.']

// Trash's (games/trash/engine/rules.ts): a two-player game won by rounds, so no Scoring paragraph.
export const TRASH_RULES: string[] = ['Also called Garbage. Each player has ten spots, Ace to 10 (five, Ace to 5, in a short game), each dealt a card face down.', 'On your turn, draw the top card of the stock, or take the top card of the discard if it has a spot. Put it in its spot: the card it covers comes up into your hand, and you play that one next.', 'Jacks are wild: a Jack fills any face-down spot, and moves on when that spot’s own card arrives. A Queen or a King, or a card whose spot is already filled, is discarded and ends your turn.', 'The first to fill every spot wins the round, and plays the next round with one spot fewer. The other player plays first.', 'Win a round with a single spot to win the match.']

// War's (games/war/engine/rules.ts): a two-player game won by taking cards, so no Scoring paragraph.
export const WAR_RULES: string[] = ['The deck is split between the two players, face down.', 'Both players turn over their top card. The higher card takes both, under its winner’s deck. Aces are high.', 'A tie is a war: each player puts three cards face down and one face up, and the higher face-up card takes every card in the battle. Another tie is another war. A player without enough cards for a war plays what they have; one with none left loses the battle.', 'A full game ends when one player has every card. A short game ends after 26 battles, and whoever has more cards wins.']

// Speed's (games/speed/engine/rules.ts): a race won by playing out, so no Scoring paragraph.
export const SPEED_RULES: string[] = ['Also called Spit. Each player has a hand of five and a draw pile of fifteen. Two side piles of five sit either side of two center piles.', 'There are no turns. Play any card in your hand onto either center pile when it is one rank higher or lower, whatever the suit. Ranks wrap: a King goes on an Ace, and an Ace on a King or a 2.', 'Your hand refills from your draw pile by itself after every card you play.', 'When nobody can play, a card from each side pile turns over onto the center pile beside it. Once the side piles run out, the center piles (all but their top cards) are shuffled into new ones.', 'The first to play every card in their hand and draw pile wins.']

// Gin Rummy's (games/ginrummy/engine/rules.ts): a two-player game scored by hands, so no Scoring paragraph.
export const GIN_RUMMY_RULES: string[] = [
  'Each player is dealt ten cards, and the next card is turned up to start the discard. The player who didn’t deal may take that card or pass; then the dealer may. If both pass, the first player draws from the stock.',
  'On your turn, draw the top card of the stock or of the discard, then throw a card onto the discard. You can’t throw back the card you just took from the discard.',
  'Melds are sets (three or four cards of a rank) and runs (three or more cards of a suit in a row, Aces low). Cards in no meld are deadwood: Aces count 1, number cards their number, and face cards 10.',
  'Instead of throwing, you may knock once your deadwood after your throw is 10 or less. Both players lay down their melds, and the other player lays off any deadwood that fits your melds.',
  'You score the difference in deadwood. With no deadwood at all you go gin: you score the other player’s deadwood plus 25, and nothing can be laid off. If the other player’s deadwood is as low as yours or lower, they undercut you, and score the difference plus 25.',
  'If the stock is down to two cards and the player who drew throws without knocking, the hand is a draw. The winner of a hand deals the next.',
  'The first to 100 wins the match (50 in a short game). With two players, pass the phone: your hand stays hidden until you tap Ready.'
]

// Four Crowns' (games/fourcrowns/engine/rules.ts): scored by what's left in hand over eleven rounds, so no Scoring
// paragraph of the solitaire kind.
export const FOUR_CROWNS_RULES: string[] = [
  'Two to four players, two decks of 52 cards, no jokers. There are eleven rounds: the first deals 3 cards each, and each round deals one more, up to 13.',
  'Each round, the rank equal to the cards dealt is wild: 3s in the first round, then 4s, and so on up to Jacks, Queens and Kings. A wild stands in for any card.',
  'On your turn, draw the top card of the stock or of the discard, then throw a card onto the discard. You can’t throw back the card you just took from the discard.',
  'Melds are books (three or more cards of a rank, suits can repeat) and runs (three or more cards of a suit in a row, Aces low).',
  'When every card but the one you throw is in a meld, you can go out. Everyone else then has one last turn, and the round ends.',
  'Cards left out of melds count against you: Aces 1, number cards their number, Jacks 11, Queens 12, Kings 13, and a wild 20. After the eleventh round, the lowest total wins.',
  'With more than one person playing, pass the phone: your hand stays hidden until you tap Ready.'
]
