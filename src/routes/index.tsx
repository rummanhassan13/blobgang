import { createFileRoute, Link } from "@tanstack/react-router";
import { seo, SITE_URL, OG_IMAGE } from "@/lib/seo";
import { motion } from "framer-motion";
import { Blob } from "@/components/blob/Blob";
import { Button } from "@/components/ui/button";
import { BLOB_INFO, BLOB_TYPES, type BlobAnimation } from "@/lib/blobs";

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

function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 pb-16 pt-6 text-center sm:px-6">
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-full bg-card px-4 py-1.5 text-sm font-semibold text-muted-foreground shadow-soft">
        multiplayer typing races, but squishy
      </motion.p>
      <motion.h1 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className="mt-5 text-6xl font-bold leading-[0.95] sm:text-8xl">
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

      {/* Meet the gang */}
      <section aria-labelledby="gang-heading" className="w-full">
      <h2 id="gang-heading" className="mt-20 text-4xl font-bold">Meet the gang</h2>
      <div className="mt-8 grid w-full grid-cols-2 gap-4 [contain-intrinsic-size:auto_600px] [content-visibility:auto] md:grid-cols-3">
        {BLOB_TYPES.map((t, i) => (
          <motion.div key={t} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 200, damping: 16 }} whileHover={{ y: -6, rotate: i % 2 ? 1.5 : -1.5 }}
            className="glass flex flex-col items-center rounded-[2rem] p-6">
            <Blob type={t} size={96} animation="idle" />
            <h3 className="mt-3 text-xl font-bold">{BLOB_INFO[t].name}</h3>
            <p className="text-sm text-muted-foreground">{BLOB_INFO[t].tagline}</p>
          </motion.div>
        ))}
      </div>
      </section>
    </main>
  );
}
