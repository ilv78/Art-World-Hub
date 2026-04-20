import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Vernis9Logo } from "@/components/vernis9-logo";

type Status = "idle" | "submitting" | "success" | "error";

const REDIRECT_AFTER_MS = 6000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PAPER = "#F7F2EA";
const INK = "#1A1810";
const INK_MUTED = "#7a7265";
const ORANGE = "#F97316";
const ORANGE_DEEP = "#C2410C";
const LINE = "rgba(26,24,16,0.14)";

export default function Koningsdag() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (status !== "success") return;
    const t = window.setTimeout(() => {
      window.location.href = "/";
    }, REDIRECT_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [status]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "koningsdag-2026" }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PAPER,
        color: INK,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Helmet>
        <title>Vernis9 — You met us at the flea market</title>
        <meta
          name="description"
          content="Leave your email and we'll send you the story behind Alexandra's reverse glass paintings."
        />
        <meta name="robots" content="noindex,nofollow" />
        <style>{`
          @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes shine { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
          @keyframes spin { to { transform: rotate(360deg); } }
          .koningsdag-email::placeholder { font-style: italic; color: rgba(26,24,16,0.45); }
          .koningsdag-email:focus { outline: none; }
          @media (max-width: 900px) {
            .koningsdag-hero { grid-template-columns: 1fr !important; gap: 32px !important; }
            .koningsdag-left { padding: 32px 24px 8px 24px !important; order: 2 !important; }
            .koningsdag-right { padding: 16px 24px 40px 24px !important; justify-content: center !important; order: 1 !important; }
            .koningsdag-header { padding: 24px !important; }
            .koningsdag-footer { padding: 16px 24px !important; }
          }
        `}</style>
      </Helmet>

      {/* Paper grain */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.4,
          mixBlendMode: "multiply",
          backgroundImage:
            "radial-gradient(rgba(60,40,10,0.06) 1px, transparent 1.2px), radial-gradient(rgba(60,40,10,0.04) 1px, transparent 1.2px)",
          backgroundSize: "4px 4px, 9px 9px",
          backgroundPosition: "0 0, 2px 3px",
        }}
      />

      {/* Header */}
      <header
        className="koningsdag-header"
        style={{
          position: "relative",
          padding: "28px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 2,
        }}
      >
        <a
          href="/"
          aria-label="Vernis9 — back to homepage"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: INK,
            textDecoration: "none",
          }}
        >
          <Vernis9Logo height={30} accent={ORANGE} showWordmark />
        </a>
      </header>

      {/* Hero */}
      <main
        className="koningsdag-hero"
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap: 0,
          alignItems: "stretch",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Left — copy + form */}
        <section
          className="koningsdag-left"
          style={{
            padding: "40px 64px 56px 64px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 680,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 28,
              animation: "fadeUp 0.6s ease-out",
            }}
          >
            <span style={{ width: 40, height: 1, background: INK, opacity: 0.45 }} />
            <span
              style={{
                fontFamily: "'Tenor Sans', sans-serif",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontSize: 10,
                color: INK,
                opacity: 0.7,
              }}
            >
              A short note
            </span>
          </div>

          <p
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 22,
              lineHeight: 1.35,
              color: INK,
              opacity: 0.75,
              margin: "0 0 18px 0",
              fontStyle: "italic",
              fontWeight: 400,
              animation: "fadeUp 0.7s ease-out",
            }}
          >
            You met us at the flea market.
          </p>

          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(36px, 4.4vw, 60px)",
              lineHeight: 1.06,
              fontWeight: 500,
              margin: "0 0 28px 0",
              letterSpacing: "-0.01em",
              color: INK,
              maxWidth: "18ch",
              animation: "fadeUp 0.8s ease-out",
            }}
          >
            Leave your email and we'll send you{" "}
            <em>the story behind Alexandra's work.</em>
          </h1>

          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: INK_MUTED,
              margin: "0 0 40px 0",
              maxWidth: "46ch",
              animation: "fadeUp 0.9s ease-out",
            }}
          >
            Reverse glass paintings
          </p>

          {status !== "success" ? (
            <form
              onSubmit={submit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                maxWidth: 480,
                animation: "fadeUp 1s ease-out",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  borderBottom: `1.5px solid ${focused ? ORANGE : "rgba(26,24,16,0.5)"}`,
                  transition: "border-color 0.2s",
                }}
              >
                <input
                  className="koningsdag-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === "error") setStatus("idle");
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="your@email.com"
                  aria-label="Email address"
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    color: INK,
                    fontSize: 20,
                    padding: "16px 0",
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: email ? "normal" : "italic",
                    letterSpacing: "0.01em",
                  }}
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  style={{
                    position: "relative",
                    border: "none",
                    background: ORANGE,
                    color: "#fff",
                    padding: "0 28px",
                    fontSize: 14,
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: status === "submitting" ? "default" : "pointer",
                    fontFamily: "'Inter', sans-serif",
                    overflow: "hidden",
                    transition: "transform 0.15s",
                    minHeight: 56,
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = "translateY(1px)";
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span
                    style={{
                      position: "relative",
                      zIndex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {status === "submitting" ? (
                      <>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          style={{ animation: "spin 0.9s linear infinite" }}
                        >
                          <circle cx="7" cy="7" r="5" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.3" />
                          <path d="M7 2 A5 5 0 0 1 12 7" stroke="#fff" strokeWidth="1.5" fill="none" />
                        </svg>
                        Sending…
                      </>
                    ) : (
                      <>
                        Send me the story
                        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden>
                          <path
                            d="M0 5 L12 5 M8 1 L12 5 L8 9"
                            stroke="#fff"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </>
                    )}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      width: "40%",
                      background:
                        "linear-gradient(115deg, transparent, rgba(255,255,255,0.25), transparent)",
                      animation: "shine 3.5s ease-in-out infinite",
                    }}
                  />
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: status === "error" ? ORANGE_DEEP : INK_MUTED,
                    letterSpacing: "0.01em",
                  }}
                  role={status === "error" ? "alert" : undefined}
                >
                  {status === "error"
                    ? "That doesn't look like an email."
                    : "One email when the story is ready."}
                </span>
              </div>
            </form>
          ) : (
            <div style={{ maxWidth: 480, animation: "fadeUp 0.5s ease-out" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "4px 0",
                  borderBottom: `1.5px solid ${ORANGE}`,
                  marginBottom: 20,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M2 4 L14 4 L14 12 L2 12 Z" stroke={ORANGE} strokeWidth="1.3" />
                  <path d="M2 4 L8 9 L14 4" stroke={ORANGE} strokeWidth="1.3" />
                </svg>
                <span
                  style={{
                    fontFamily: "'Tenor Sans', sans-serif",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontSize: 10,
                    color: ORANGE,
                  }}
                >
                  Sent
                </span>
              </div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 40,
                  lineHeight: 1.1,
                  margin: "0 0 16px 0",
                  fontWeight: 500,
                }}
              >
                Thank you.
              </h2>
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: INK_MUTED,
                  margin: "0 0 28px 0",
                  maxWidth: "42ch",
                }}
              >
                The story is on its way. Check your inbox — and the one that pretends to be spam.
              </p>
              <p
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 18,
                  color: INK,
                  opacity: 0.75,
                  margin: "0 0 28px 0",
                }}
              >
                — Alexandra &amp; Vernis9
              </p>
              <a
                href="/"
                style={{
                  fontFamily: "'Tenor Sans', sans-serif",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontSize: 11,
                  color: ORANGE,
                  textDecoration: "none",
                  borderBottom: `1px solid ${ORANGE}`,
                  paddingBottom: 2,
                }}
              >
                Back to vernis9.art →
              </a>
            </div>
          )}
        </section>

        {/* Right — painting */}
        <section
          className="koningsdag-right"
          style={{
            position: "relative",
            padding: "24px 64px 56px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              position: "relative",
              animation: "fadeUp 1.2s ease-out",
            }}
          >
            <div
              style={{
                position: "relative",
                boxShadow:
                  "0 50px 90px -30px rgba(60,40,10,0.45), 0 20px 40px -20px rgba(60,40,10,0.3)",
              }}
            >
              <img
                src="/koningsdag/alexandra-painting.jpg"
                alt="Reverse glass painting by Alexandra, 2026"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                fontSize: 10,
                color: INK_MUTED,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontFamily: "'Tenor Sans', sans-serif",
              }}
            >
              <span>Reverse glass painting · Alexandra, 2026</span>
              <span style={{ opacity: 0.6 }}>AC 2026</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="koningsdag-footer"
        style={{
          padding: "18px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `1px solid ${LINE}`,
          fontSize: 11,
          color: INK_MUTED,
          position: "relative",
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontFamily: "'Tenor Sans', sans-serif",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          vernis9.art
        </span>
        <span
          style={{
            fontStyle: "italic",
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 13,
          }}
        >
          Happy Koningsdag
        </span>
      </footer>
    </div>
  );
}
