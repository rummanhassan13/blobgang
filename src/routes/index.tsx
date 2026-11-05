import { createFileRoute, Link } from "@tanstack/react-router";
import { seo, SITE_URL, OG_IMAGE } from "@/lib/seo";
import { motion } from "framer-motion";
import { Blob } from "@/components/blob/Blob";
import { Button } from "@/components/ui/button";
import { useState, type ReactNode } from "react";
import { ScrollBackdrop } from "@/components/landing/ScrollBackdrop";
import { BLOB_INFO, BLOB_TYPES, type BlobAnimation, type BlobType } from "@/lib/blobs";

export const Route = createFileRoute("/")({
  head: () => {
    const base = seo({
      title: "Blob Gang: the squishy multiplayer typing race",
      description: "Race your friends as squishy jelly blobs. Share a room code, type the same passage, and wobble across the finish line first. Free in your browser.",
      path: "/",
    });
    return {
      ...base,
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": ["WebApplication", "VideoGame"],
          name: "Blob Gang",
          url: SITE_URL,
          image: OG_IMAGE,
          description: "A funky multiplayer typing race where players race as squishy jelly blobs.",
          applicationCategory: "GameApplication",
          genre: ["Typing game", "Racing", "Multiplayer"],
          operatingSystem: "Any (web browser)",
          playMode: ["MultiPlayer", "SinglePlayer"],
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      }],
    };
  },
  component: Landing,
});

const ANIMS: BlobAnimation[] = ["happy", "squash", "jiggle", "idle", "happy", "squash"];

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

const STEPS: { blob: BlobType; anim: BlobAnimation; title: string; text: string }[] = [
  { blob: "mochi", anim: "happy", title: "Pick your blob", text: "Six squishy originals. Choose the one that matches your typing energy." },
  { blob: "gloop", anim: "jiggle", title: "Share a room link", text: "Create a room and send the link. Friends hop in with one tap." },
  { blob: "zippy", anim: "squash", title: "Type to squish ahead", text: "Every correct word pushes your blob down the lane. Typos make it wobble." },
];

function GangCard({ t, i }: { t: BlobType; i: number }) {
  const [active, setActive] = useState(false);
  return (
    <Reveal delay={i * 0.05}>
      <button type="button" aria-label={`${BLOB_INFO[t].name}: ${BLOB_INFO[t].tagline}`}
        onMouseEnter={() => setActive(true)} onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)} onBlur={() => setActive(false)}
        onClick={() => setActive((a) => !a)}
        className="glass flex w-full flex-col items-center rounded-[2rem] p-5 transition-transform duration-300 hover:-translate-y-1 sm:p-6">
        <Blob key={active ? "squash" : "idle"} type={t} size={88} animation={active ? "squash" : "idle"} mood={active ? "happy" : undefined} />
        <h3 className="mt-3 text-lg font-bold sm:text-xl">{BLOB_INFO[t].name}</h3>
        <p className="text-sm text-muted-foreground">{BLOB_INFO[t].tagline}</p>
      </button>
    </Reveal>
  );
}

const sectionCls = "mt-24 w-full sm:mt-32";
const h2Cls = "text-3xl font-bold sm:text-4xl";

function Landing() {
  return (
    <>
    <ScrollBackdrop />
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 pb-10 pt-6 text-center sm:px-6">
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-full bg-card px-4 py-1.5 text-sm font-semibold text-muted-foreground shadow-soft">
        multiplayer typing races, but squishy
      </motion.p>
      <motion.h1 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className="mt-5 text-5xl font-bold leading-[0.95] min-[400px]:text-6xl sm:text-8xl">
        Type fast.<br />Wobble faster.
      </motion.h1>
      <p className="mt-5 max-w-lg text-lg text-muted-foreground">
        Pick a jelly blob, grab a room code, and race your friends through short passages. First blob to the finish gets the glory.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild variant="jelly" size="lg"><Link to="/auth">Join the gang</Link></Button>
        <Button asChild variant="soft" size="lg"><Link to="/home">I have an account</Link></Button>
      </div>

      {/* Race track */}
      <div role="img" aria-label="All six blobs racing along their lanes" className="glass relative mt-14 w-full overflow-hidden rounded-[2.5rem] px-4 py-8 sm:px-8">
        <div className="space-y-2">
          {BLOB_TYPES.map((t, i) => (
            <div key={t} className="relative h-16 border-b border-dashed border-border last:border-0">
              <motion.div className="absolute bottom-1"
                initial={{ left: "0%" }}
                animate={{ left: ["0%", "86%"] }}
                transition={{ duration: 5 + ((i * 1.7) % 4), repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: i * 0.25 }}>
                <Blob type={t} size={58} animation={ANIMS[i]} />
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      <section aria-labelledby="how-heading" className={sectionCls}>
        <Reveal><h2 id="how-heading" className={h2Cls}>How it works</h2></Reveal>
        <ol className="relative mx-auto mt-10 max-w-3xl text-left">
          <span aria-hidden className="absolute bottom-6 left-[2.25rem] top-6 w-0 border-l-2 border-dashed border-border" />
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Reveal delay={i * 0.1} className="relative flex items-center gap-4 py-4 sm:gap-6">
                <div className="relative z-10 flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full bg-background">
                  <Blob type={s.blob} size={60} animation={s.anim} />
                </div>
                <span aria-hidden className="w-10 shrink-0 text-center font-display text-5xl font-bold leading-none text-primary/30 sm:w-12 sm:text-6xl">{i + 1}</span>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold sm:text-2xl">{s.title}</h3>
                  <p className="mt-0.5 text-muted-foreground">{s.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="gang-heading" className={sectionCls}>
        <Reveal>
          <h2 id="gang-heading" className={h2Cls}>Meet the gang</h2>
          <p className="mt-2 text-muted-foreground">Hover or tap a blob to give it a squish.</p>
        </Reveal>
        <div className="mt-8 grid w-full grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {BLOB_TYPES.map((t, i) => <GangCard key={t} t={t} i={i} />)}
        </div>
      </section>

      <section aria-labelledby="modes-heading" className={sectionCls}>
        <Reveal><h2 id="modes-heading" className={h2Cls}>Race modes</h2></Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Reveal className="glass flex flex-col items-center rounded-[2rem] p-7 sm:p-8">
            <div className="flex -space-x-4"><Blob type="grumbo" size={64} animation="jiggle" /><Blob type="bubbles" size={64} animation="happy" /><Blob type="snooze" size={64} animation="idle" /></div>
            <h3 className="mt-3 text-2xl font-bold">Multiplayer rooms</h3>
            <p className="mt-2 max-w-sm text-muted-foreground">Up to 8 friends, one passage, live lanes. Placement bonuses for the quickest blobs.</p>
            <Button asChild variant="jelly" className="mt-5"><Link to="/home">Start a room</Link></Button>
          </Reveal>
          <Reveal delay={0.1} className="glass flex flex-col items-center rounded-[2rem] p-7 sm:p-8">
            <div className="flex -space-x-6"><Blob type="mochi" size={64} animation="squash" /><Blob type="mochi" size={64} animation="idle" ghost /></div>
            <h3 className="mt-3 text-2xl font-bold">Solo ghost practice</h3>
            <p className="mt-2 max-w-sm text-muted-foreground">Race a see-through ghost of your best run and beat your own record.</p>
            <Button asChild variant="soft" className="mt-5"><Link to="/solo">Practice solo</Link></Button>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="cta-heading" className={sectionCls}>
        <Reveal className="glass flex flex-col items-center rounded-[2.5rem] px-6 py-12 sm:py-16">
          <Blob type="bubbles" size={96} animation="happy" mood="happy" />
          <h2 id="cta-heading" className="mt-3 text-4xl font-bold sm:text-6xl">Ready to wobble?</h2>
          <p className="mt-3 max-w-md text-muted-foreground">It's free and takes ten seconds to pick a blob.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild variant="jelly" size="lg"><Link to="/auth">Sign up</Link></Button>
            <Button asChild variant="soft" size="lg"><Link to="/solo">Play solo</Link></Button>
          </div>
        </Reveal>
      </section>
    </main>
    <footer className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
      <span className="flex items-center gap-2 font-display font-semibold text-foreground"><Blob type="bubbles" size={24} animation="none" /> Blob Gang</span>
      <nav aria-label="Footer" className="flex gap-1">
        <Link to="/leaderboard" className="inline-flex min-h-11 items-center rounded-full px-3 hover:text-foreground">Leaderboard</Link>
        <Link to="/solo" className="inline-flex min-h-11 items-center rounded-full px-3 hover:text-foreground">Solo</Link>
        <Link to="/auth" className="inline-flex min-h-11 items-center rounded-full px-3 hover:text-foreground">Sign in</Link>
      </nav>
      <span>© {new Date().getUTCFullYear()} Blob Gang</span>
    </footer>
    </>
  );
}
