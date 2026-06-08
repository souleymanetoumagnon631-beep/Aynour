import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Check, ShieldCheck, Truck, Gift, Star, BadgeCheck,
  Sparkles, Clock, MessageCircle, CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast, Toaster } from "sonner";

const HERO_IMG = "https://ae-pic-a1.aliexpress-media.com/kf/Se8a3695006144feeb53c0be59df0cd56e.jpg_960x960q75.jpg_.avif";
const LIFESTYLE_IMG = "https://ae-pic-a1.aliexpress-media.com/kf/S91535e24632941318d37c89e31b32f32L.jpg_960x960q75.jpg_.avif";
const WHATSAPP_NUMBER = "22300000000"; // ← Remplace par ton vrai numéro

function handleImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.src.endsWith(".avif")) img.src = img.src.slice(0, -5) + ".jpg";
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bracelet Ayat Al-Kursi — Acier Inoxydable | Livraison Mali" },
      { name: "description", content: "Bracelet Ayat Al-Kursi en acier inoxydable 316L. Gravure Coran authentique. Paiement à la livraison au Mali." },
      { property: "og:title", content: "Bracelet Ayat Al-Kursi — Portez la parole d'Allah" },
      { property: "og:image", content: HERO_IMG },
    ],
  }),
  component: LandingPage,
});

declare global {
  interface Window { fbq?: (...args: unknown[]) => void; }
}

const COLORS = [
  { name: "Argent", swatch: "linear-gradient(135deg,#e8e8e8,#a8a8a8 60%,#6b6b6b)" },
  { name: "Or", swatch: "linear-gradient(135deg,#fbe39a,#d4a44a 55%,#8a6312)" },
  { name: "Or Rosé", swatch: "linear-gradient(135deg,#f6cfc1,#d18b73 55%,#7d4836)" },
  { name: "Noir", swatch: "linear-gradient(135deg,#3a3a3a,#101010 60%,#000)" },
] as const;

type ColorName = (typeof COLORS)[number]["name"];

function track(event: string, data?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", event, data);
  }
}

async function sendCAPI(eventName: string, orderData: {
  full_name: string; phone: string; color: string; value: number;
}) {
  try {
    await supabase.functions.invoke("meta-capi", {
      body: {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        user_data: { phone: orderData.phone, full_name: orderData.full_name },
        custom_data: { value: orderData.value, currency: "XOF", content_name: "Bracelet Ayat Al-Kursi", color: orderData.color },
      },
    });
  } catch (err) {
    console.warn("CAPI non configuré encore:", err);
  }
}

function LandingPage() {
  const [color, setColor] = useState<ColorName>("Or");
  const [submitting, setSubmitting] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [utm, setUtm] = useState({ source: "", campaign: "", content: "" });
  const productRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setUtm({ source: p.get("utm_source") ?? "", campaign: p.get("utm_campaign") ?? "", content: p.get("utm_content") ?? "" });
  }, []);

  useEffect(() => {
    if (!productRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          track("ViewContent", { content_name: "Bracelet Ayat Al-Kursi", content_category: "Jewelry" });
          obs.disconnect();
        }
      });
    }, { threshold: 0.3 });
    obs.observe(productRef.current);
    return () => obs.disconnect();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const fd = new FormData(e.currentTarget);
    const full_name = String(fd.get("full_name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const address = String(fd.get("address") ?? "").trim();
    const chosenColor = String(fd.get("color") ?? color) as ColorName;

    if (full_name.length < 2 || phone.length < 6 || address.length < 4) {
      toast.error("Veuillez remplir tous les champs correctement.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("orders").insert({
        full_name, phone, address, color: chosenColor,
        utm_source: utm.source || null,
        utm_campaign: utm.campaign || null,
        utm_content: utm.content || null,
      });
      if (error) throw error;

      track("Purchase", { value: 15000, currency: "XOF", content_name: "Bracelet Ayat Al-Kursi", color: chosenColor });
      await sendCAPI("Purchase", { full_name, phone, color: chosenColor, value: 15000 });

      setOrderDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'envoyer la commande. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (orderDone) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-5 text-center">
        <Toaster theme="dark" position="top-center" richColors />
        <div className="rounded-2xl border border-gold/40 bg-card p-10 max-w-md w-full">
          <CheckCircle2 size={64} className="text-gold mx-auto mb-6" />
          <h1 className="text-3xl font-semibold">Commande reçue !</h1>
          <p className="mt-3 text-muted-foreground">
            Merci pour votre commande. Notre équipe vous contactera dans les prochaines heures pour confirmer la livraison.
          </p>
          <div className="mt-6 rounded-lg border border-border/60 bg-background p-4 text-sm text-left space-y-2">
            <p className="text-muted-foreground">📦 Livraison à domicile</p>
            <p className="text-muted-foreground">💵 Paiement à la livraison</p>
            <p className="text-muted-foreground">📞 On vous appelle sous 24h</p>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-md transition"
          >
            <MessageCircle size={18} />
            Nous contacter sur WhatsApp
          </a>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Toaster theme="dark" position="top-center" richColors />

      {/* Bouton WhatsApp flottant */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Assalamu alaykum, j'ai une question sur le Bracelet Ayat Al-Kursi.")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-3 rounded-full shadow-xl transition"
      >
        <MessageCircle size={20} />
        <span className="text-sm">Une question ?</span>
      </a>

      {/* Announcement bar */}
      <div className="sticky top-0 z-40 gold-gradient text-primary-foreground text-center text-[12px] sm:text-sm font-medium py-2 px-3">
        <span className="inline-flex items-center gap-2">
          <Truck size={14} />
          Livraison gratuite au Mali — Commandez avant 20h pour expédition aujourd'hui
        </span>
      </div>

      {/* Hero */}
      <section ref={productRef} className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
             style={{ backgroundImage: "radial-gradient(ellipse at top, oklch(0.22 0.05 80 / 0.35), transparent 60%)" }} />
        <div className="mx-auto max-w-6xl px-5 pt-10 pb-6 sm:pt-16 sm:pb-12 grid gap-8 md:grid-cols-2 md:items-center relative">
          <div className="order-2 md:order-1">
            <p className="text-xs sm:text-sm tracking-[0.25em] uppercase text-gold mb-4">Édition limitée</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.05]">
              Portez la parole <br />
              <span className="text-gold-gradient italic">d'Allah</span> sur votre poignet
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-md">
              Bracelet Ayat Al-Kursi en acier inoxydable — Élégant, résistant, spirituel.
            </p>
            <div className="mt-7">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                Couleur : <span className="text-foreground">{color}</span>
              </p>
              <div className="flex gap-3">
                {COLORS.map((c) => (
                  <button key={c.name} type="button" onClick={() => setColor(c.name)}
                    aria-label={c.name} aria-pressed={color === c.name}
                    className={`h-10 w-10 rounded-full ring-offset-2 ring-offset-background transition-all ${color === c.name ? "ring-2 ring-gold scale-110" : "ring-1 ring-border"}`}
                    style={{ backgroundImage: c.swatch }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (<Star key={i} size={16} className="fill-gold text-gold" />))}
              </div>
              <span className="text-sm text-muted-foreground">1 200+ clients au Mali et en Afrique de l'Ouest</span>
            </div>
            <a href="#commander"
              onClick={() => track("AddToCart", { content_name: "Bracelet Ayat Al-Kursi", color })}
              className="mt-7 inline-flex w-full sm:w-auto items-center justify-center gold-gradient text-primary-foreground font-semibold px-7 py-4 rounded-md shadow-lg shadow-black/40 hover:opacity-95 transition">
              Commander — Paiement à la livraison
            </a>
          </div>
          <div className="order-1 md:order-2">
            <div className="relative rounded-xl overflow-hidden border border-border/70 bg-card">
              <img src={HERO_IMG} alt="Bracelet Ayat Al-Kursi" width={960} height={960} fetchPriority="high" decoding="async" className="w-full h-auto block" onError={handleImgError} />
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {[
              { icon: BadgeCheck, label: "Gravure authentique" },
              { icon: ShieldCheck, label: "Acier inoxydable premium" },
              { icon: Truck, label: "Livraison rapide Mali" },
              { icon: Check, label: "Satisfait ou remboursé" },
            ].map((b) => (
              <div key={b.label} className="rounded-md border border-border/60 bg-card/60 py-3 px-2 text-xs sm:text-sm flex flex-col items-center gap-1">
                <b.icon size={18} className="text-gold" />
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="hairline mx-auto max-w-5xl" />

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <h2 className="text-3xl sm:text-4xl text-center font-semibold">
          Un bijou de <span className="text-gold-gradient italic">foi</span> et de prestige
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Sparkles, title: "Gravure Coran authentique", desc: "Calligraphie arabe de l'Ayat Al-Kursi, gravée au laser pour une netteté éternelle." },
            { icon: ShieldCheck, title: "Acier inoxydable 316L", desc: "Hypoallergénique, résistant à l'eau, à la rouille et au temps. Conçu pour durer." },
            { icon: Gift, title: "Cadeau parfait", desc: "Présenté dans un écrin élégant — idéal pour l'Aïd, un mariage ou un être cher." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-border/60 bg-card p-6">
              <div className="h-11 w-11 rounded-full grid place-items-center gold-gradient text-primary-foreground">
                <f.icon size={20} />
              </div>
              <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Order form */}
      <section id="commander" className="bg-card/40 border-y border-border/60">
        <div className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
          <h2 className="text-3xl sm:text-4xl text-center font-semibold">
            Passez votre <span className="text-gold-gradient italic">commande</span>
          </h2>
          <p className="text-center text-sm text-muted-foreground mt-2">Paiement à la livraison — aucune avance requise.</p>
          <form ref={formRef} onSubmit={handleSubmit}
            onFocus={() => track("InitiateCheckout", { content_name: "Bracelet Ayat Al-Kursi", color })}
            className="mt-8 space-y-4">
            <Field label="Nom complet">
              <input name="full_name" required minLength={2} maxLength={120} autoComplete="name" className="input-luxe" placeholder="Ex. Aminata Koné" />
            </Field>
            <Field label="Numéro de téléphone">
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border bg-muted text-sm text-muted-foreground">+223</span>
                <input name="phone" type="tel" required inputMode="tel" minLength={6} maxLength={30} autoComplete="tel" className="input-luxe rounded-l-none" placeholder="76 12 34 56" />
              </div>
            </Field>
            <Field label="Adresse de livraison">
              <textarea name="address" required minLength={4} maxLength={500} rows={3} className="input-luxe resize-none" placeholder="Quartier, ville, point de repère" />
            </Field>
            <Field label="Couleur choisie">
              <select name="color" value={color} onChange={(e) => setColor(e.target.value as ColorName)} className="input-luxe">
                {COLORS.map((c) => (<option key={c.name} value={c.name}>{c.name}</option>))}
              </select>
            </Field>
            <input type="hidden" name="utm_source" value={utm.source} />
            <input type="hidden" name="utm_campaign" value={utm.campaign} />
            <input type="hidden" name="utm_content" value={utm.content} />
            <button type="submit" disabled={submitting}
              className="w-full gold-gradient text-primary-foreground font-semibold py-4 rounded-md shadow-lg shadow-black/50 hover:opacity-95 transition disabled:opacity-60">
              {submitting ? "Envoi en cours…" : "Commander maintenant — Livraison à domicile"}
            </button>
            <p className="text-center text-xs text-muted-foreground">Paiement à la livraison disponible</p>
          </form>
        </div>
        <style>{`
          .input-luxe { width:100%; background:var(--input); color:var(--foreground); border:1px solid var(--border); border-radius:0.5rem; padding:0.75rem 0.875rem; font-size:1rem; outline:none; transition:border-color .15s,box-shadow .15s; }
          .input-luxe:focus { border-color:var(--gold); box-shadow:0 0 0 3px color-mix(in oklab,var(--gold) 25%,transparent); }
        `}</style>
      </section>

      {/* Lifestyle */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:py-20 grid gap-10 md:grid-cols-2 md:items-center">
        <img src={LIFESTYLE_IMG} alt="Bracelet Ayat Al-Kursi porté au poignet" width={960} height={960} loading="lazy" decoding="async" className="w-full h-auto rounded-xl border border-border/60" onError={handleImgError} />
        <div>
          <h2 className="text-3xl sm:text-4xl font-semibold leading-tight">
            Un bijou qui <span className="text-gold-gradient italic">porte votre foi</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base leading-relaxed">
            Chaque fois que vous baissez les yeux, l'Ayat Al-Kursi vous rappelle la protection et la grandeur d'Allah.
          </p>
        </div>
      </section>

      <div className="hairline mx-auto max-w-5xl" />

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <h2 className="text-3xl sm:text-4xl text-center font-semibold">
          Ce qu'ils en <span className="text-gold-gradient italic">disent</span>
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            { name: "Aminata K.", city: "Bamako", text: "Je l'ai offert à mon mari pour l'Aïd. Il ne l'enlève plus. La gravure est magnifique." },
            { name: "Moussa D.", city: "Sikasso", text: "Je le porte tous les jours depuis 3 mois. Aucune trace, aucune rouille." },
            { name: "Fatoumata T.", city: "Bamako", text: "Cadeau parfait pour mon frère. Livraison rapide, paiement à la livraison sans souci." },
            { name: "Ibrahim C.", city: "Mopti", text: "Élégant et discret. Je le porte au travail et à la mosquée. Très satisfait." },
          ].map((t) => (
            <figure key={t.name} className="rounded-lg border border-border/60 bg-card p-6">
              <div className="flex gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (<Star key={i} size={14} className="fill-gold text-gold" />))}
              </div>
              <blockquote className="text-sm sm:text-base text-foreground/90 leading-relaxed">« {t.text} »</blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">
                <span className="text-gold font-medium">{t.name}</span> — {t.city}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <h2 className="text-3xl sm:text-4xl text-center font-semibold">
          Questions <span className="text-gold-gradient italic">fréquentes</span>
        </h2>
        <Accordion type="single" collapsible className="mt-8">
          {[
            { q: "Est-ce que c'est du vrai acier inoxydable ?", a: "Oui, 100 %. Acier inoxydable 316L, hypoallergénique et résistant à la rouille." },
            { q: "Est-ce que la gravure s'efface avec le temps ?", a: "Non. Gravure laser en profondeur dans le métal. Elle ne s'efface pas." },
            { q: "Combien de temps pour la livraison au Mali ?", a: "Bamako : 24-48h. Autres villes : 2-4 jours ouvrés." },
            { q: "Puis-je commander pour offrir en cadeau ?", a: "Absolument. Livré dans un écrin élégant prêt à offrir." },
            { q: "Le paiement est-il sécurisé ?", a: "Vous payez à la livraison, en espèces, après vérification. Aucun risque." },
          ].map((item, i) => (
            <AccordionItem key={i} value={`q-${i}`} className="border-border/60">
              <AccordionTrigger className="text-left text-base sm:text-lg">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <UrgencySection />

      <footer className="border-t border-border/60 mt-10">
        <div className="mx-auto max-w-6xl px-5 py-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Bracelet Ayat Al-Kursi — Tous droits réservés.
        </div>
      </footer>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-foreground/90 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function UrgencySection() {
  const target = useMemo(() => {
    if (typeof window === "undefined") return Date.now() + 6 * 3600 * 1000;
    const key = "ayat_countdown_target";
    const existing = window.localStorage.getItem(key);
    if (existing) {
      const t = Number(existing);
      if (!Number.isNaN(t) && t > Date.now()) return t;
    }
    const t = Date.now() + 6 * 3600 * 1000;
    window.localStorage.setItem(key, String(t));
    return t;
  }, []);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, target - now);
  const h = Math.floor(remaining / 3600_000);
  const m = Math.floor((remaining % 3600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section className="mx-auto max-w-3xl px-5 py-14 sm:py-20 text-center">
      <div className="rounded-2xl border border-gold/40 bg-card p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
             style={{ backgroundImage: "radial-gradient(circle at center, oklch(0.81 0.13 82 / 0.12), transparent 65%)" }} />
        <div className="relative">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold">
            <Clock size={14} /> Stock limité
          </p>
          <h2 className="mt-4 text-2xl sm:text-3xl font-semibold leading-tight">
            Il ne reste que <span className="text-gold-gradient">12 bracelets</span> en stock
          </h2>
          <p className="mt-2 text-muted-foreground text-sm">Commandez maintenant avant rupture.</p>
          <div className="mt-6 flex justify-center gap-3 sm:gap-4">
            {[{ v: pad(h), l: "Heures" }, { v: pad(m), l: "Min" }, { v: pad(s), l: "Sec" }].map((u) => (
              <div key={u.l} className="min-w-[72px] rounded-md border border-border/60 bg-background py-3">
                <div className="text-3xl sm:text-4xl font-semibold text-gold-gradient tabular-nums">{u.v}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{u.l}</div>
              </div>
            ))}
          </div>
          <a href="#commander" className="mt-8 inline-flex w-full sm:w-auto items-center justify-center gold-gradient text-primary-foreground font-semibold px-8 py-4 rounded-md shadow-lg shadow-black/40">
            Je commande mon bracelet
          </a>
        </div>
      </div>
    </section>
  );
}
