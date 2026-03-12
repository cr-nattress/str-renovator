/**
 * @module Landing
 * @layer Surface
 *
 * Full-screen marketing landing page shown to unauthenticated visitors.
 * Self-contained: inline styles, rAF-driven SVG animation, zero Tailwind.
 * Replaces the default Clerk <SignIn /> widget in <SignedOut>.
 *
 * @see docs/plans/landing-page-design.md — original JSX component
 * @see docs/plans/landing-page-design-doc.md — integration guide
 */

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useClerk } from "@clerk/clerk-react";
import { TIER_LIMITS } from "@str-renovator/shared";
import type { Tier } from "@str-renovator/shared";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomColors {
  wall: string;
  floor: string;
  furniture: string;
  accent: string;
}

interface Room {
  id: number;
  label: string;
  before: RoomColors;
  after: RoomColors;
  score: string;
  lift: string;
}

type InputMode = "url" | "photos";
type AnimPhase = "holding_before" | "transforming" | "holding_after" | "resetting";

// ── Color math helpers ────────────────────────────────────────────────────────

function hexToRgb(c: string): [number, number, number] {
  if (!c) return [128, 128, 128];
  if (c.startsWith("#"))
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const m = c.match(/\d+/g);
  return m ? [+m[0], +m[1], +m[2]] : [128, 128, 128];
}

function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

function toRgba(c: string, a: number): string {
  const [r, g, b] = hexToRgb(c);
  return `rgba(${r},${g},${b},${a})`;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const ROOMS: Room[] = [
  {
    id: 1, label: "Mountain Cabin · Gatlinburg",
    before: { wall: "#3d2415", floor: "#2a1508", furniture: "#5c3020", accent: "#7a4020" },
    after: { wall: "#f0e6d3", floor: "#c4a07a", furniture: "#7a5c3a", accent: "#8B6914" },
    score: "B → A+", lift: "+$62/night",
  },
  {
    id: 2, label: "Beach Condo · Destin",
    before: { wall: "#8a9eaa", floor: "#6a7f8c", furniture: "#7a8f9c", accent: "#506070" },
    after: { wall: "#e8f4f8", floor: "#7fc4d8", furniture: "#4a8fa8", accent: "#2a7a9a" },
    score: "C+ → A", lift: "+$48/night",
  },
  {
    id: 3, label: "Urban Loft · Nashville",
    before: { wall: "#2e2e2e", floor: "#1e1e1e", furniture: "#404040", accent: "#505050" },
    after: { wall: "#252535", floor: "#1a1828", furniture: "#6a5a9c", accent: "#8a7cbc" },
    score: "C → A−", lift: "+$55/night",
  },
  {
    id: 4, label: "Lake House · Tahoe",
    before: { wall: "#4a5a4a", floor: "#303830", furniture: "#506050", accent: "#5a6a5a" },
    after: { wall: "#e8f4e4", floor: "#88b080", furniture: "#5a8060", accent: "#3a7040" },
    score: "B− → A", lift: "+$74/night",
  },
];

const HEADLINE_WORDS = [
  "top-performing listing.",
  "best design decisions.",
  "renovation roadmap.",
  "highest-rated version.",
  "true earning potential.",
  "five-star first impression.",
];

const STATS = [
  { num: "2,800+", label: "Properties Analyzed" },
  { num: "$58", label: "Avg. Nightly Rate Lift" },
  { num: "4.2×", label: "Avg. Renovation ROI" },
];

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useWindowSize() {
  const [size, setSize] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1400,
    h: typeof window !== "undefined" ? window.innerHeight : 900,
  }));

  useEffect(() => {
    let rafId: number;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setSize({ w: window.innerWidth, h: window.innerHeight });
      });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return size;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

// ── SVG Room Scene ────────────────────────────────────────────────────────────

const RoomScene = memo(function RoomScene({
  room,
  progress,
  width,
  height,
}: {
  room: Room;
  progress: number;
  width: number;
  height: number;
}) {
  const pv = progress;
  const wallCol = lerpColor(room.before.wall, room.after.wall, pv);
  const floorCol = lerpColor(room.before.floor, room.after.floor, pv);
  const furnCol = lerpColor(room.before.furniture, room.after.furniture, pv);
  const accentCol = lerpColor(room.before.accent, room.after.accent, pv);
  const lightA = 0.04 + pv * 0.22;
  const lampA = 0.05 + pv * 0.35;
  const winGlow = pv > 0.5 ? (pv - 0.5) * 2 * 0.35 : 0;
  const uid = `rs${room.id}`;

  return (
    <svg
      width={width} height={height} viewBox="0 0 400 280"
      preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}
      role="img"
    >
      <title>{`${room.label} — ${pv > 0.5 ? "after" : "before"} renovation`}</title>
      <defs>
        <radialGradient id={`${uid}lg`} cx="50%" cy="28%" r="50%">
          <stop offset="0%" stopColor="rgba(255,215,140,1)" stopOpacity={lightA * 2.4} />
          <stop offset="100%" stopColor="rgba(255,215,140,0)" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${uid}wg`} cx="50%" cy="42%" r="40%">
          <stop offset="0%" stopColor="rgba(200,235,255,1)" stopOpacity={winGlow} />
          <stop offset="100%" stopColor="rgba(200,235,255,0)" stopOpacity={0} />
        </radialGradient>
        <filter id={`${uid}gf`}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="62" fill={wallCol} />
      <rect y="62" width="400" height="140" fill={wallCol} />
      <path d="M0 202 L400 202 L400 280 L0 280 Z" fill={floorCol} />
      {[0, 50, 100, 150, 200, 250, 300, 350].map((xv) => (
        <line key={xv} x1={xv} y1="202" x2={xv + 28} y2="280" stroke={accentCol} strokeWidth={pv > 0.5 ? "0.4" : "1.2"} opacity={0.08 + pv * 0.07} />
      ))}
      <rect y="196" width="400" height="7" fill={furnCol} opacity={0.45 + pv * 0.3} />
      <rect x="145" y="78" width="110" height="88" rx="3" fill="rgba(200,235,255,0.12)" stroke={accentCol} strokeWidth={pv > 0.5 ? "1.8" : "0.8"} opacity={0.65 + pv * 0.3} />
      <rect x="145" y="78" width="110" height="88" fill={`url(#${uid}wg)`} />
      <line x1="200" y1="78" x2="200" y2="166" stroke={accentCol} strokeWidth="0.7" opacity="0.35" />
      <line x1="145" y1="122" x2="255" y2="122" stroke={accentCol} strokeWidth="0.7" opacity="0.35" />
      <rect x="72" y="168" width="256" height="38" rx={pv > 0.5 ? 7 : 2} fill={furnCol} />
      <rect x="72" y="155" width="256" height="16" rx={pv > 0.5 ? 5 : 1} fill={furnCol} opacity="0.82" />
      <rect x="72" y="155" width="18" height="51" rx="2" fill={furnCol} opacity="0.9" />
      <rect x="310" y="155" width="18" height="51" rx="2" fill={furnCol} opacity="0.9" />
      {pv > 0.3 && [92, 152, 212, 260].map((cx, ci) => (
        <rect key={ci} x={cx} y="158" width={ci === 3 ? 44 : 52} height="11" rx="3" fill={accentCol} opacity={0.25 + pv * 0.45} />
      ))}
      {pv > 0.15 && (
        <ellipse cx="200" cy="216" rx={85 * Math.min(pv / 0.4, 1)} ry={13 * Math.min(pv / 0.4, 1)} fill={accentCol} opacity={0.14 * Math.min(pv / 0.4, 1)} />
      )}
      <rect x="148" y="208" width="104" height="7" rx={pv > 0.5 ? 3 : 1} fill={furnCol} opacity="0.65" />
      <rect x="156" y="215" width="5" height="13" fill={furnCol} opacity="0.45" />
      <rect x="239" y="215" width="5" height="13" fill={furnCol} opacity="0.45" />
      <rect x="55" y="140" width="4" height="36" fill={furnCol} opacity="0.6" />
      <ellipse cx="57" cy="138" rx="14" ry="7" fill={furnCol} opacity="0.72" />
      <ellipse cx="57" cy="138" rx={10 + pv * 8} ry={6 + pv * 4} fill="rgba(255,210,110,1)" opacity={lampA * 2.5} filter={`url(#${uid}gf)`} />
      <rect x="341" y="140" width="4" height="36" fill={furnCol} opacity="0.6" />
      <ellipse cx="343" cy="138" rx="14" ry="7" fill={furnCol} opacity="0.72" />
      <ellipse cx="343" cy="138" rx={10 + pv * 8} ry={6 + pv * 4} fill="rgba(255,210,110,1)" opacity={lampA * 2.5} filter={`url(#${uid}gf)`} />
      <circle cx="200" cy="18" r={3 + pv * 3} fill="rgba(255,225,160,0.9)" />
      <circle cx="200" cy="18" r={18 + pv * 22} fill="rgba(255,225,160,1)" opacity={lightA} filter={`url(#${uid}gf)`} />
      {pv > 0.4 && (() => { const ap = Math.min((pv - 0.4) / 0.5, 1); return <rect x="55" y="84" width={52 * ap} height={38 * ap} rx="2" fill={accentCol} opacity={0.38 * ap} />; })()}
      {pv > 0.6 && (() => { const ap = Math.min((pv - 0.6) / 0.4, 1); return <rect x="295" y="88" width={46 * ap} height={32 * ap} rx="2" fill={accentCol} opacity={0.32 * ap} />; })()}
      <rect width="400" height="280" fill={`url(#${uid}lg)`} />
    </svg>
  );
});

// ── Feed Card ─────────────────────────────────────────────────────────────────

const FeedCard = memo(function FeedCard({ room, delay }: { room: Room; delay: number }) {
  const [sliderX, setSliderX] = useState(0.28);
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((ev: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setSliderX(Math.max(0.04, Math.min(0.96, (ev.clientX - rect.left) / rect.width)));
  }, []);

  return (
    <div
      ref={cardRef}
      aria-label={`${room.label} before and after comparison — drag to reveal`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setSliderX(0.28); }}
      onMouseMove={handleMove}
      style={{
        flex: "0 0 272px", height: 186, borderRadius: 11, overflow: "hidden", position: "relative",
        border: "1px solid rgba(255,255,255,0.07)", cursor: "col-resize",
        animation: `fadeUp 0.55s ease ${delay}s both`,
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        boxShadow: hovered ? "0 22px 44px rgba(0,0,0,0.5)" : "0 4px 18px rgba(0,0,0,0.25)",
        transition: "transform 0.4s cubic-bezier(0.4,0,0.2,1), box-shadow 0.4s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <RoomScene room={room} progress={0} width={272} height={186} />
      </div>
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${(1 - sliderX) * 100}% 0 0)`, transition: hovered ? "none" : "clip-path 0.5s cubic-bezier(0.4,0,0.2,1)" }}>
        <RoomScene room={room} progress={1} width={272} height={186} />
      </div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${sliderX * 100}%`, width: "2px", background: "rgba(255,255,255,0.85)", transform: "translateX(-50%)", transition: hovered ? "none" : "left 0.5s cubic-bezier(0.4,0,0.2,1)", boxShadow: "0 0 10px rgba(255,255,255,0.5)", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 26, height: 26, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#222", fontWeight: 800, letterSpacing: "-1px", boxShadow: "0 2px 8px rgba(0,0,0,0.35)", userSelect: "none" }}>⟷</div>
      </div>
      <div style={{ position: "absolute", top: 8, left: 10, fontSize: 9, fontFamily: "monospace", letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>Before</div>
      <div style={{ position: "absolute", top: 8, right: 10, fontSize: 9, fontFamily: "monospace", letterSpacing: "0.1em", color: "rgba(255,255,255,0.65)", textTransform: "uppercase" }}>After</div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 12px 10px", background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontFamily: "'Georgia',serif" }}>{room.label}</span>
        <span style={{ fontSize: 11, color: "#a8e6a0", fontWeight: 700, fontFamily: "monospace" }}>{room.lift}</span>
      </div>
    </div>
  );
});

// ── Cycling Headline Word ─────────────────────────────────────────────────────

function CyclingWord({ words, interval, color }: { words: string[]; interval: number; color: string }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx((prev) => (prev + 1) % words.length); setVisible(true); }, 500);
    }, interval);
    return () => clearInterval(timer);
  }, [words, interval]);

  return (
    <em style={{
      fontStyle: "italic", color: color || "rgba(255,255,255,0.72)", display: "inline-block",
      opacity: visible ? 1 : 0, filter: visible ? "blur(0px)" : "blur(8px)",
      transform: visible ? "translateY(0) scale(1)" : "translateY(7px) scale(0.97)",
      transition: "opacity 0.5s cubic-bezier(0.4,0,0.2,1), transform 0.5s cubic-bezier(0.4,0,0.2,1), filter 0.5s cubic-bezier(0.4,0,0.2,1)",
      minWidth: 300, textShadow: "0 1px 14px rgba(0,0,0,0.95)",
    }}>{words[idx]}</em>
  );
}

// ── Pricing Section ───────────────────────────────────────────────────────────

const TIERS: { key: Tier; name: string; price: string; cta: string; highlight?: boolean }[] = [
  { key: "free", name: "Free", price: "$0", cta: "Get Started Free" },
  { key: "pro", name: "Pro", price: "$29/mo", cta: "Start Free Trial", highlight: true },
  { key: "business", name: "Business", price: "$99/mo", cta: "Start Free Trial" },
];

const PRICING_ROWS: { label: string; getValue: (tier: Tier) => string }[] = [
  { label: "Properties", getValue: (t) => TIER_LIMITS[t].properties === Infinity ? "Unlimited" : String(TIER_LIMITS[t].properties) },
  { label: "Photos / Property", getValue: (t) => TIER_LIMITS[t].photosPerProperty === Infinity ? "Unlimited" : String(TIER_LIMITS[t].photosPerProperty) },
  { label: "Analyses / Month", getValue: (t) => TIER_LIMITS[t].analysesPerMonth === Infinity ? "Unlimited" : String(TIER_LIMITS[t].analysesPerMonth) },
  { label: "Image Quality", getValue: (t) => TIER_LIMITS[t].imageQuality === "high" ? "Premium" : "Standard" },
];

function PricingSection({ uiAccent, onSignUp }: { uiAccent: string; onSignUp: () => void }) {
  return (
    <section style={{ position: "relative", zIndex: 10, padding: "64px 30px 80px", maxWidth: 1000, margin: "0 auto" }} aria-label="Pricing plans">
      <h2 style={{ fontSize: 28, fontWeight: 400, textAlign: "center", color: "rgba(255,255,255,0.9)", marginBottom: 8 }}>Simple, transparent pricing</h2>
      <p style={{ fontSize: 13, textAlign: "center", color: "rgba(255,255,255,0.4)", fontFamily: "monospace", marginBottom: 48 }}>Start free. Upgrade when you need more.</p>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {TIERS.map((tier) => (
          <div key={tier.key} style={{
            flex: "0 1 280px", padding: "28px 24px", borderRadius: 14,
            background: tier.highlight ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
            border: tier.highlight ? `1px solid ${toRgba(uiAccent, 0.4)}` : "1px solid rgba(255,255,255,0.07)",
          }}>
            {tier.highlight && (
              <div style={{ fontSize: 9, letterSpacing: "0.12em", color: uiAccent, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 12 }}>Most Popular</div>
            )}
            <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: 4 }}>{tier.name}</div>
            <div style={{ fontSize: 28, fontWeight: 400, color: "rgba(255,255,255,0.85)", marginBottom: 20 }}>{tier.price}</div>
            <ul style={{ listStyle: "none", padding: 0, marginBottom: 24 }}>
              {PRICING_ROWS.map((row) => (
                <li key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>{row.label}</span>
                  <span style={{ color: "rgba(255,255,255,0.75)", fontFamily: "monospace", fontWeight: 600 }}>{row.getValue(tier.key)}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={onSignUp}
              aria-label={`${tier.cta} — ${tier.name} plan`}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 8, border: "none", cursor: "pointer",
                background: tier.highlight ? `linear-gradient(135deg,${uiAccent},${toRgba(uiAccent, 0.6)})` : "rgba(255,255,255,0.08)",
                color: tier.highlight ? "#060606" : "rgba(255,255,255,0.6)",
                fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "monospace", textTransform: "uppercase",
                transition: "opacity 0.3s ease",
              }}
              onMouseEnter={(ev) => { ev.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(ev) => { ev.currentTarget.style.opacity = "1"; }}
            >{tier.cta}</button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Session storage key for pending listing URL ───────────────────────────────

export const PENDING_URL_KEY = "listiq_pending_url";

// ── Main Landing Page ─────────────────────────────────────────────────────────

export function Landing() {
  const { redirectToSignIn, redirectToSignUp } = useClerk();
  const reducedMotion = usePrefersReducedMotion();
  const { w: winW, h: winH } = useWindowSize();

  const [mode, setMode] = useState<InputMode>("url");
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [bgRoomIdx, setBgRoomIdx] = useState(0);
  const [bgProgress, setBgProgress] = useState(reducedMotion ? 1 : 0);
  const [bgPhase, setBgPhase] = useState<AnimPhase>(reducedMotion ? "holding_after" : "holding_before");
  const [bgAccent, setBgAccent] = useState(reducedMotion ? ROOMS[0].after.accent : ROOMS[0].before.accent);
  const [centerOvl, setCenterOvl] = useState(reducedMotion ? 0.6 : 0.28);
  const [labelOpacity, setLabelOpacity] = useState(1);
  const prevLabelKey = useRef("0holding_before");

  useEffect(() => {
    const key = `${bgRoomIdx}${bgPhase}`;
    if (key !== prevLabelKey.current) {
      prevLabelKey.current = key;
      setLabelOpacity(0);
      const t = setTimeout(() => setLabelOpacity(1), 80);
      return () => clearTimeout(t);
    }
  }, [bgPhase, bgRoomIdx]);

  // rAF animation loop — disabled when user prefers reduced motion
  useEffect(() => {
    if (reducedMotion) return;

    const HOLD_MS = 2400;
    const TRANS_MS = 4200;
    const RESET_MS = 450;
    let phase: AnimPhase = "holding_before";
    let phaseStart = performance.now();
    let roomIdx = 0;
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - phaseStart;
      const room = ROOMS[roomIdx];
      const nextRoom = ROOMS[(roomIdx + 1) % ROOMS.length];

      if (phase === "holding_before") {
        setBgAccent(room.before.accent);
        setCenterOvl(0.28);
        if (elapsed >= HOLD_MS) { phase = "transforming"; phaseStart = now; setBgPhase("transforming"); }
      } else if (phase === "transforming") {
        const raw = Math.min(elapsed / TRANS_MS, 1);
        const ease = easeInOutCubic(raw);
        setBgProgress(ease);
        setBgAccent(lerpColor(room.before.accent, room.after.accent, ease));
        setCenterOvl(0.28 + ease * 0.32);
        if (raw >= 1) { phase = "holding_after"; phaseStart = now; setBgPhase("holding_after"); }
      } else if (phase === "holding_after") {
        setBgAccent(room.after.accent);
        setCenterOvl(0.6);
        if (elapsed >= HOLD_MS) { phase = "resetting"; phaseStart = now; setBgPhase("resetting"); }
      } else if (phase === "resetting") {
        const raw = Math.min(elapsed / RESET_MS, 1);
        const ease = easeInOutCubic(raw);
        setBgProgress(1 - ease);
        setBgAccent(lerpColor(room.after.accent, nextRoom.before.accent, ease));
        setCenterOvl(0.6 - ease * 0.32);
        if (raw >= 1) {
          roomIdx = (roomIdx + 1) % ROOMS.length;
          setBgRoomIdx(roomIdx);
          setBgProgress(0);
          phase = "holding_before"; phaseStart = now; setBgPhase("holding_before");
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [reducedMotion]);

  const handleCta = useCallback(() => {
    if (mode === "url" && inputValue.trim()) {
      sessionStorage.setItem(PENDING_URL_KEY, inputValue.trim());
    }
    redirectToSignUp({ redirectUrl: "/" });
  }, [mode, inputValue, redirectToSignUp]);

  const handleSignIn = useCallback(() => {
    redirectToSignIn();
  }, [redirectToSignIn]);

  const handleSignUp = useCallback(() => {
    redirectToSignUp({ redirectUrl: "/" });
  }, [redirectToSignUp]);

  const currentRoom = ROOMS[bgRoomIdx];
  const uiAccent = lerpColor(bgAccent, "#ffffff", 0.62);
  const logoGrad = `linear-gradient(135deg,${uiAccent},${bgAccent})`;
  const hasInput = inputValue.trim().length > 0 || mode === "photos";
  const dotColor = bgPhase === "holding_after" ? "#a8e6a0" : bgPhase === "transforming" ? "#f5c842" : "#888";
  const phaseLabel = bgPhase === "holding_after" ? currentRoom.score : bgPhase === "transforming" ? "Analyzing…" : "Before";
  const animStyle = reducedMotion ? "none" : undefined;

  return (
    <div className="landing-page" style={{ minHeight: "100vh", background: "#080808", color: "#f0ede8", overflow: "hidden", fontFamily: "'Georgia','Times New Roman',serif" }}>
      <style>{`
        @keyframes fadeUp   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes heroIn   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes drift    { 0%,100%{transform:scale(1.03) translate(0,0)} 33%{transform:scale(1.05) translate(-7px,-4px)} 66%{transform:scale(1.04) translate(5px,-6px)} }
        @keyframes pulseCTA { 0%,100%{opacity:1} 50%{opacity:0.8} }
        @keyframes scanLine { 0%{transform:translateX(-100%);opacity:0} 5%{opacity:1} 88%{opacity:1} 100%{transform:translateX(110vw);opacity:0} }
        @keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.38;transform:scale(0.72)} }
        .landing-page *{box-sizing:border-box;margin:0;padding:0}
        .landing-page input{outline:none}
        .landing-page button{cursor:pointer;border:none;background:none}
        .landing-page ::-webkit-scrollbar{width:3px;height:3px}
        .landing-page ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}
        @media(prefers-reduced-motion:reduce){
          .landing-page *{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}
        }
      `}</style>

      {/* ── BACKGROUND ─────────────────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: "-6%", animation: animStyle ?? "drift 20s ease-in-out infinite" }}>
          <RoomScene room={currentRoom} progress={bgProgress} width={Math.round(winW * 1.14)} height={Math.round(winH * 1.14)} />
        </div>
        {bgPhase === "transforming" && !reducedMotion && (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, width: "3px", background: "linear-gradient(to bottom,transparent,rgba(255,255,255,0.09) 50%,transparent)", animation: "scanLine 4.2s linear forwards" }} />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 65% 55% at 50% 42%,rgba(0,0,0,${centerOvl.toFixed(2)}) 0%,rgba(0,0,0,0.78) 100%)` }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: "linear-gradient(to top,rgba(0,0,0,0.97) 0%,transparent 100%)" }} />

        <div style={{ position: "absolute", bottom: 18, left: 22, display: "flex", alignItems: "center", gap: 9, opacity: 0.65 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, boxShadow: bgPhase === "holding_after" ? `0 0 8px ${dotColor}` : "none", transition: "background 1.1s ease, box-shadow 1.1s ease", animation: bgPhase === "transforming" && !reducedMotion ? "dotPulse 0.85s ease-in-out infinite" : "none" }} />
          <span style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)", fontFamily: "monospace", textTransform: "uppercase", opacity: labelOpacity, transition: "opacity 0.35s ease" }}>
            {currentRoom.label} · {phaseLabel}
          </span>
        </div>

        <div style={{ position: "absolute", bottom: 20, right: 22, display: "flex", gap: 5 }}>
          {ROOMS.map((rv, iv) => (
            <div key={rv.id} style={{ height: 4, borderRadius: 3, width: iv === bgRoomIdx ? 20 : 5, background: iv === bgRoomIdx ? toRgba(uiAccent, 0.75) : "rgba(255,255,255,0.17)", transition: "width 0.55s cubic-bezier(0.4,0,0.2,1)" }} />
          ))}
        </div>
      </div>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "17px 30px", background: "linear-gradient(to bottom,rgba(0,0,0,0.48),transparent)", animation: animStyle ?? "heroIn 0.7s ease 0.1s both" }} aria-label="Landing page navigation">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 27, height: 27, borderRadius: 6, background: logoGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⌂</div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.05em", fontFamily: "monospace", color: "rgba(255,255,255,0.92)" }}>LISTIQ</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ padding: "5px 12px", borderRadius: 20, background: "rgba(168,230,160,0.1)", border: "1px solid rgba(168,230,160,0.22)" }}>
            <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(168,230,160,0.9)", fontFamily: "monospace", textTransform: "uppercase" }}>Free</span>
          </div>
          <button onClick={handleSignIn} aria-label="Sign in to your account" style={{ padding: "7px 17px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.7)", fontSize: 11, letterSpacing: "0.09em", fontFamily: "monospace", background: "rgba(255,255,255,0.05)", transition: "background 0.3s ease, border-color 0.3s ease, color 0.3s ease" }}
            onMouseEnter={(ev) => { const t = ev.currentTarget; t.style.background = "rgba(255,255,255,0.1)"; t.style.borderColor = "rgba(255,255,255,0.36)"; t.style.color = "rgba(255,255,255,0.92)"; }}
            onMouseLeave={(ev) => { const t = ev.currentTarget; t.style.background = "rgba(255,255,255,0.05)"; t.style.borderColor = "rgba(255,255,255,0.18)"; t.style.color = "rgba(255,255,255,0.7)"; }}
          >SIGN IN</button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", paddingTop: 76 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 20, border: `1px solid ${toRgba(uiAccent, 0.3)}`, background: toRgba(uiAccent, 0.08), marginBottom: 26, animation: animStyle ?? "heroIn 0.6s ease 0.2s both" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: uiAccent, boxShadow: `0 0 7px ${toRgba(uiAccent, 0.85)}`, animation: reducedMotion ? "none" : "dotPulse 2.2s ease-in-out infinite" }} />
          <span style={{ fontSize: 10, letterSpacing: "0.14em", color: uiAccent, fontFamily: "monospace", textTransform: "uppercase", textShadow: "0 1px 10px rgba(0,0,0,0.95)" }}>Rental Property Intelligence</span>
        </div>

        <h1 style={{ fontSize: "clamp(34px,5.8vw,68px)", fontWeight: 400, lineHeight: 1.1, textAlign: "center", maxWidth: 660, marginBottom: 14, color: "rgba(255,255,255,0.97)", letterSpacing: "-0.01em", animation: animStyle ?? "heroIn 0.6s ease 0.3s both", textShadow: "0 2px 20px rgba(0,0,0,0.98), 0 1px 6px rgba(0,0,0,0.8)" }}>
          See your property's{" "}
          <CyclingWord words={HEADLINE_WORDS} interval={2800} color={uiAccent} />
        </h1>

        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", textAlign: "center", maxWidth: 400, lineHeight: 1.65, marginBottom: 38, fontFamily: "monospace", letterSpacing: "0.01em", animation: animStyle ?? "heroIn 0.6s ease 0.4s both", textShadow: "0 1px 12px rgba(0,0,0,0.98)" }}>
          Upload photos or paste a listing URL. Get a free renovation report in seconds.
        </p>

        {/* Input card */}
        <div style={{ width: "100%", maxWidth: 540, background: "rgba(8,8,8,0.84)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: `1px solid ${inputFocused ? toRgba(uiAccent, 0.52) : "rgba(255,255,255,0.09)"}`, borderRadius: 15, overflow: "hidden", boxShadow: inputFocused ? `0 0 0 4px ${toRgba(uiAccent, 0.09)}, 0 28px 64px rgba(0,0,0,0.65)` : "0 28px 64px rgba(0,0,0,0.48)", transition: "border-color 0.4s ease, box-shadow 0.4s ease", animation: animStyle ?? "heroIn 0.6s ease 0.5s both" }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)" }} role="tablist" aria-label="Input method">
            {([{ id: "url" as const, label: "Listing URL" }, { id: "photos" as const, label: "Upload Photos" }]).map((tab) => (
              <button key={tab.id} role="tab" aria-selected={mode === tab.id} onClick={() => setMode(tab.id)} style={{ flex: 1, padding: "12px 0", fontSize: 10, letterSpacing: "0.12em", fontFamily: "monospace", textTransform: "uppercase", color: mode === tab.id ? uiAccent : "rgba(255,255,255,0.3)", borderBottom: mode === tab.id ? `2px solid ${uiAccent}` : "2px solid transparent", transition: "color 0.35s ease, border-color 0.35s ease" }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 18 }} role="tabpanel">
            {mode === "url" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,0.04)", border: `1px solid ${inputFocused ? toRgba(uiAccent, 0.24) : "rgba(255,255,255,0.07)"}`, borderRadius: 9, padding: "11px 14px", transition: "border-color 0.4s ease" }}>
                <span style={{ fontSize: 15, opacity: 0.38 }} aria-hidden="true">🔗</span>
                <input type="text" placeholder="airbnb.com/rooms/...  or  vrbo.com/..." aria-label="Listing URL" value={inputValue} onChange={(ev) => setInputValue(ev.target.value)} onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)} onKeyDown={(ev) => { if (ev.key === "Enter" && hasInput) handleCta(); }} style={{ flex: 1, background: "none", border: "none", color: "rgba(255,255,255,0.84)", fontSize: 13, fontFamily: "monospace", letterSpacing: "0.01em" }} />
              </div>
            ) : (
              <div tabIndex={0} onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)} style={{ border: `2px dashed ${toRgba(uiAccent, 0.18)}`, borderRadius: 9, padding: "26px", textAlign: "center", cursor: "pointer", transition: "border-color 0.35s ease" }} onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = toRgba(uiAccent, 0.46); }} onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = toRgba(uiAccent, 0.18); }}>
                <div style={{ fontSize: 22, marginBottom: 8, opacity: 0.36 }} aria-hidden="true">📷</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "monospace", lineHeight: 1.65 }}>
                  Drop photos here or click to browse<br />
                  <span style={{ fontSize: 10, opacity: 0.7 }}>JPG · PNG · up to 20 photos</span>
                </div>
              </div>
            )}

            <button onClick={handleCta} aria-label={mode === "url" ? "Analyze my listing" : "Upload and analyze"} style={{ width: "100%", marginTop: 16, padding: "13px 0", borderRadius: 9, background: hasInput ? `linear-gradient(135deg,${uiAccent},${bgAccent})` : "rgba(255,255,255,0.07)", color: hasInput ? "#060606" : "rgba(255,255,255,0.26)", fontSize: 12, fontWeight: 700, letterSpacing: "0.11em", fontFamily: "monospace", textTransform: "uppercase", transition: "color 0.4s ease, box-shadow 0.4s ease", animation: hasInput && !reducedMotion ? "pulseCTA 2.8s ease-in-out infinite" : "none", boxShadow: hasInput ? `0 6px 28px ${toRgba(uiAccent, 0.4)}` : "none" }}>
              {mode === "url" ? "Analyze My Listing →" : "Upload & Analyze →"}
            </button>

            <p style={{ textAlign: "center", marginTop: 9, fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", letterSpacing: "0.05em" }}>
              Free account · Results in seconds
            </p>
          </div>
        </div>

        <div style={{ marginTop: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, animation: animStyle ?? "heroIn 0.6s ease 0.85s both", opacity: 0.28 }}>
          <span style={{ fontSize: 9, letterSpacing: "0.16em", fontFamily: "monospace", textTransform: "uppercase" }}>Recent transformations</span>
          <span style={{ fontSize: 12 }} aria-hidden="true">↓</span>
        </div>
      </div>

      {/* ── FEED ─────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 10, paddingBottom: 0, background: "linear-gradient(to bottom,transparent,rgba(0,0,0,0.96) 8%)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 30px 18px", maxWidth: 1160, margin: "0 auto" }}>
          <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)", fontFamily: "monospace", textTransform: "uppercase" }}>Hover to reveal transformation</span>
          <span style={{ fontSize: 10, letterSpacing: "0.08em", color: "rgba(168,230,160,0.45)", fontFamily: "monospace" }}>{ROOMS.length} examples →</span>
        </div>

        <div style={{ display: "flex", gap: 14, padding: "4px 30px 14px", overflowX: "auto", scrollbarWidth: "none", maxWidth: 1160, margin: "0 auto" }}>
          {ROOMS.map((rm, ri) => <FeedCard key={rm.id} room={rm} delay={0.08 * ri} />)}
          <div style={{ flex: "0 0 150px", height: 186, borderRadius: 11, border: "1px dashed rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, cursor: "pointer", background: "rgba(255,255,255,0.015)", transition: "border-color 0.35s ease, background 0.35s ease" }}
            onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; ev.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; ev.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}
          >
            <span style={{ fontSize: 20, opacity: 0.28 }} aria-hidden="true">→</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", letterSpacing: "0.08em", textAlign: "center", lineHeight: 1.6 }}>Browse<br />all examples</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", justifyContent: "center", gap: winW < 640 ? 32 : 64, flexWrap: "wrap", padding: "38px 30px 0", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 22, maxWidth: 1160, margin: "22px auto 0" }}>
          {STATS.map((st) => (
            <div key={st.label} style={{ textAlign: "center", minWidth: winW < 640 ? "40%" : "auto" }}>
              <div style={{ fontSize: winW < 640 ? 24 : 30, fontWeight: 400, color: "rgba(255,255,255,0.84)", letterSpacing: "-0.025em", marginBottom: 5 }}>{st.num}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>{st.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRICING ────────────────────────────────────────────────────── */}
      <PricingSection uiAccent={uiAccent} onSignUp={handleSignUp} />

      {/* ── FOOTER CTA ─────────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "0 30px 64px" }}>
        <button onClick={handleSignUp} aria-label="Get started free" style={{ padding: "14px 36px", borderRadius: 10, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${uiAccent},${bgAccent})`, color: "#060606", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "monospace", textTransform: "uppercase", boxShadow: `0 6px 28px ${toRgba(uiAccent, 0.3)}`, transition: "opacity 0.3s ease" }}
          onMouseEnter={(ev) => { ev.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(ev) => { ev.currentTarget.style.opacity = "1"; }}
        >Get Started Free →</button>
        <p style={{ marginTop: 12, fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>No credit card required</p>
      </div>
    </div>
  );
}
