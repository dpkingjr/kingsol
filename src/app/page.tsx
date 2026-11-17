import Link from "next/link";

const GAMES = [
  {
    href: "/klondike",
    name: "Klondike",
    tagline: "The classic. Build down in alternating colors and send every suit home.",
    cards: ["K♠", "Q♥", "J♣"],
    options: "Draw 1 or Draw 3",
  },
  {
    href: "/freecell",
    name: "FreeCell",
    tagline: "Every card face up, four free cells. Almost every deal can be won.",
    cards: ["7♦", "6♣", "5♥"],
    options: "Optional auto-play",
  },
  {
    href: "/spider",
    name: "Spider",
    tagline: "Two decks, ten columns. Line up eight runs from King to Ace.",
    cards: ["K♠", "Q♠", "J♠"],
    options: "1, 2 or 4 suits",
  },
  {
    href: "/pyramid",
    name: "Pyramid",
    tagline: "Pair cards that add up to 13 and bring the pyramid down.",
    cards: ["8♣", "5♦", "K♥"],
    options: "Three passes through the stock",
  },
];

export default function Home() {
  return (
    <main className="home table">
      <header className="home-header">
        <h1>Kingsol Solitaire</h1>
        <p>Choose a game.</p>
      </header>
      <ul className="game-grid">
        {GAMES.map((g) => (
          <li key={g.href}>
            <Link href={g.href} className="game-tile">
              <div className="tile-cards" aria-hidden>
                {g.cards.map((c, i) => (
                  <span key={i} className={`mini-card${/[♥♦]/.test(c) ? " red" : ""}`} style={{ rotate: `${(i - 1) * 10}deg` }}>
                    {c}
                  </span>
                ))}
              </div>
              <h2>{g.name}</h2>
              <p>{g.tagline}</p>
              <span className="tile-options">{g.options}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
