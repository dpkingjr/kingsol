import { SUIT_SYMBOL, Suit, isRed } from "@/lib/cards";

/*
 * Original court-card artwork in the traditional double-ended style: a half-length figure
 * drawn once in the top half, clipped at a diagonal, then repeated upside down.
 * Woodcut-style black outlines and the classic red / blue / yellow palette.
 */

const RED = "#c4161c";
const BLUE = "#1f3a93";
const YELLOW = "#f0b72f";
const BLACK = "#141414";
const SKIN = "#f7e2c6";
const WHITE = "#fffdf7";
const STEEL = "#a9b0b8";
const WOOD = "#7a4a1e";
const LINE = { stroke: BLACK, strokeWidth: 0.5, strokeLinejoin: "round" as const };

type Rank = 11 | 12 | 13;

export function FaceArt({ rank, suit }: { rank: Rank; suit: Suit }) {
  const half = `fc-${suit}${rank}`;
  const clip = `${half}-clip`;
  const black = !isRed(suit);
  // Black suits swap the red and blue so the twelve cards don't all look alike.
  const robe = rank === 12 ? (black ? RED : BLUE) : black ? BLUE : RED;
  const panel = robe === RED ? BLUE : RED;
  const pip = isRed(suit) ? RED : BLACK;

  return (
    <svg viewBox="0 0 60 84" className="face-art" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <polygon points="0,0 60,0 60,39 0,45" />
        </clipPath>
        <g id={half} clipPath={`url(#${clip})`}>
          <g transform="translate(0 2.5)">
            <Body robe={robe} panel={panel} rank={rank} />
            {/* heads drawn a little larger, in the proportions of old court cards */}
            <g transform="translate(30 23) scale(1.15) translate(-30 -23)">
              <Head rank={rank} />
            </g>
            {rank === 13 && <Sword />}
            {rank === 12 && <Rose />}
            {rank === 11 && <Halberd />}
          </g>
          <text x="8" y="12" textAnchor="middle" fontSize="9" fill={pip} fontWeight="700">
            {SUIT_SYMBOL[suit]}
          </text>
        </g>
      </defs>

      <rect x="1" y="1" width="58" height="82" fill={WHITE} />
      <use href={`#${half}`} />
      <use href={`#${half}`} transform="rotate(180 30 42)" />
      <line x1="1" y1="45" x2="59" y2="39" stroke={BLACK} strokeWidth="0.7" />
      <rect x="1" y="1" width="58" height="82" fill="none" stroke={BLACK} strokeWidth="0.9" />
    </svg>
  );
}

function Body({ robe, panel, rank }: { robe: string; panel: string; rank: Rank }) {
  return (
    <g>
      {/* shoulders and robe */}
      <path d="M5 48 L7 31 Q11 24 21 23 L39 23 Q49 24 53 31 L55 48 Z" fill={robe} {...LINE} />
      {/* folds */}
      <path d="M12 30 L11 48 M16 27 L15.5 48 M44 27 L44.5 48 M48 30 L49 48" stroke={BLACK} strokeWidth="0.35" opacity="0.6" />
      {/* centre panel with yellow trim and studs */}
      <path d="M22 23 L38 23 L40.5 48 L19.5 48 Z" fill={panel} {...LINE} />
      <path d="M22 23 L19.5 48 M38 23 L40.5 48" stroke={YELLOW} strokeWidth="1.6" />
      <path d="M22 23 L19.5 48 M38 23 L40.5 48" stroke={BLACK} strokeWidth="0.35" />
      <line x1="30" y1="25" x2="30" y2="48" stroke={YELLOW} strokeWidth="1.2" />
      {[29, 35, 41].map((y) => (
        <g key={y}>
          <circle cx="25.5" cy={y} r="1.1" fill={YELLOW} {...LINE} strokeWidth={0.3} />
          <circle cx="34.5" cy={y} r="1.1" fill={YELLOW} {...LINE} strokeWidth={0.3} />
        </g>
      ))}
      {/* collar: ermine for King and Queen, a pleated ruff for the Jack */}
      {rank === 11 ? (
        <path d="M21 23 Q30 28 39 23 L38 21 Q30 25 22 21 Z" fill={YELLOW} {...LINE} />
      ) : (
        <>
          <path d="M16 25 Q30 31 44 25 L44 22 Q30 28 16 22 Z" fill={WHITE} {...LINE} />
          {[19, 23.5, 28, 32, 36.5, 41].map((x) => (
            <path key={x} d={`M${x} ${25 + (x > 30 ? (44 - x) : x - 16) * 0.12} l0 1.6`} stroke={BLACK} strokeWidth="0.8" />
          ))}
        </>
      )}
    </g>
  );
}

function Head({ rank }: { rank: Rank }) {
  return (
    <g>
      {/* hair behind the face */}
      {rank === 12 && <path d="M23.5 8 Q20 17 21.5 25 L38.5 25 Q40 17 36.5 8 Z" fill={YELLOW} {...LINE} />}
      {rank === 11 && <path d="M24 9 Q21 15 22.5 22 L37.5 22 Q39 15 36 9 Z" fill={YELLOW} {...LINE} />}
      {rank === 13 && <path d="M24.5 9 Q22.5 14 24 19 L36 19 Q37.5 14 35.5 9 Z" fill={YELLOW} {...LINE} />}

      {/* neck and face */}
      <rect x="27.5" y="18" width="5" height="5.5" fill={SKIN} {...LINE} />
      <ellipse cx="30" cy="13.2" rx="5.4" ry="6.4" fill={SKIN} {...LINE} />

      {/* hair strands */}
      {rank !== 13 && (
        <path
          d="M24.2 12 Q23.4 17 24.2 21 M25 11 Q24.6 15 25.4 19 M35.8 12 Q36.6 17 35.8 21 M35 11 Q35.4 15 34.6 19"
          fill="none"
          stroke={BLACK}
          strokeWidth="0.35"
        />
      )}

      {/* brows, eyes, nose, mouth: the solemn look of old woodblock cards */}
      <path d="M26.2 10.6 Q27.6 9.8 29 10.5 M31 10.5 Q32.4 9.8 33.8 10.6" fill="none" stroke={BLACK} strokeWidth="0.5" />
      <path d="M26.4 12.3 Q27.6 11.5 28.8 12.3 Q27.6 12.9 26.4 12.3 Z M31.2 12.3 Q32.4 11.5 33.6 12.3 Q32.4 12.9 31.2 12.3 Z" fill={WHITE} stroke={BLACK} strokeWidth="0.35" />
      <circle cx="27.9" cy="12.25" r="0.45" fill={BLACK} />
      <circle cx="32.7" cy="12.25" r="0.45" fill={BLACK} />
      <path d="M30 12.6 L29.2 15.6 Q30 16 30.8 15.6" fill="none" stroke={BLACK} strokeWidth="0.4" />
      <path d="M28.6 17.4 Q30 18 31.4 17.4" fill="none" stroke={RED} strokeWidth="0.8" strokeLinecap="round" />
      {rank === 12 && (
        <>
          <circle cx="26.6" cy="15.4" r="1" fill={RED} opacity="0.25" />
          <circle cx="33.4" cy="15.4" r="1" fill={RED} opacity="0.25" />
        </>
      )}

      {/* King: forked beard and moustache */}
      {rank === 13 && (
        <>
          <path d="M24.8 14 Q24.6 21 27.5 24.5 L30 22.5 L32.5 24.5 Q35.4 21 35.2 14 Q33.5 18.5 30 18.6 Q26.5 18.5 24.8 14 Z" fill={YELLOW} {...LINE} />
          <path d="M26.5 19 L27.5 23 M28.5 19.6 L29 22.5 M31.5 19.6 L31 22.5 M33.5 19 L32.5 23" stroke={BLACK} strokeWidth="0.3" />
          <path d="M26.8 16.9 Q28.6 15.8 30 16.6 Q31.4 15.8 33.2 16.9 Q31.4 17.4 30 17 Q28.6 17.4 26.8 16.9 Z" fill={YELLOW} {...LINE} strokeWidth={0.35} />
        </>
      )}
      {/* Jack: thin moustache */}
      {rank === 11 && <path d="M28 16.7 Q30 15.9 32 16.7" fill="none" stroke={BLACK} strokeWidth="0.45" />}

      {/* headwear */}
      {rank === 13 && (
        <g>
          <path d="M23.6 8.2 L23 1.8 L26 4.6 L28 1.2 L30 4 L32 1.2 L34 4.6 L37 1.8 L36.4 8.2 Z" fill={YELLOW} {...LINE} />
          <rect x="23.4" y="6.2" width="13.2" height="2.4" fill={RED} {...LINE} />
          {[25.5, 30, 34.5].map((x) => (
            <circle key={x} cx={x} cy="7.4" r="0.6" fill={WHITE} />
          ))}
          {[23, 28, 32, 37].map((x, i) => (
            <circle key={x} cx={x} cy={i === 0 || i === 3 ? 1.8 : 1.2} r="0.6" fill={YELLOW} {...LINE} strokeWidth={0.3} />
          ))}
        </g>
      )}
      {rank === 12 && (
        <g>
          <path d="M24.4 8.4 L24 3.6 L26.6 5.6 L30 2.4 L33.4 5.6 L36 3.6 L35.6 8.4 Z" fill={YELLOW} {...LINE} />
          <rect x="24.2" y="7" width="11.6" height="2" fill={BLUE} {...LINE} />
          <circle cx="30" cy="2.4" r="0.9" fill={RED} {...LINE} strokeWidth={0.3} />
          <circle cx="24" cy="3.6" r="0.6" fill={WHITE} {...LINE} strokeWidth={0.3} />
          <circle cx="36" cy="3.6" r="0.6" fill={WHITE} {...LINE} strokeWidth={0.3} />
        </g>
      )}
      {rank === 11 && (
        <g>
          <path d="M22.5 8.6 Q23 3 30 2.6 Q37 3 37.5 8.6 Z" fill={RED} {...LINE} />
          <rect x="22" y="7.4" width="16" height="2" rx="0.6" fill={YELLOW} {...LINE} />
          <path d="M33 4 Q39 0 42 3 Q38 2.6 35 5.2 Z" fill={WHITE} {...LINE} strokeWidth={0.4} />
        </g>
      )}
    </g>
  );
}

function Hand({ x, y }: { x: number; y: number }) {
  return <ellipse cx={x} cy={y} rx="2" ry="1.6" fill={SKIN} {...LINE} />;
}

function Sword() {
  return (
    <g>
      <path d="M46 4 L47.2 5.5 L47.2 28 L44.8 28 L44.8 5.5 Z" fill={STEEL} {...LINE} />
      <line x1="46" y1="6" x2="46" y2="27" stroke={BLACK} strokeWidth="0.3" />
      <rect x="41.5" y="28" width="9" height="1.6" rx="0.5" fill={YELLOW} {...LINE} />
      <rect x="45.2" y="29.6" width="1.6" height="4" fill={WOOD} {...LINE} />
      <Hand x={46} y={31.5} />
    </g>
  );
}

function Rose() {
  return (
    <g>
      <path d="M44 33 Q45 27 46 22" fill="none" stroke="#2f7d32" strokeWidth="0.9" />
      <path d="M45 27 Q48 25.5 49 27 Q47 28.5 45 27 Z" fill="#2f7d32" {...LINE} strokeWidth={0.3} />
      <circle cx="46" cy="20.5" r="2.6" fill={RED} {...LINE} />
      <path d="M44.6 20.5 Q46 18.6 47.4 20.5 Q46 22 44.6 20.5 Z" fill="none" stroke={BLACK} strokeWidth="0.3" />
      <circle cx="46" cy="20.5" r="0.7" fill={YELLOW} />
      <Hand x={44} y={32} />
    </g>
  );
}

function Halberd() {
  return (
    <g>
      <rect x="45.4" y="3" width="1.4" height="34" fill={WOOD} {...LINE} />
      <path d="M46.8 6 Q53 7 52.5 12 Q50 10.5 46.8 11 Z" fill={STEEL} {...LINE} />
      <path d="M45.4 7 L42.5 8.5 L45.4 10 Z" fill={STEEL} {...LINE} />
      <path d="M46.1 3 L46.1 0.5" stroke={BLACK} strokeWidth="0.8" />
      <Hand x={46} y={30} />
    </g>
  );
}
