'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ArrowRight, Phone, Mail, CheckCircle, ChevronRight, UserPlus, Package, MapPin, ClipboardCheck, Radar,
  Calculator, BookUser, Bell, FileText, Headphones, ShieldCheck,
  Smartphone, Shirt, Apple, Sofa, BookOpen, Wrench, Pill, Factory, Boxes,
} from 'lucide-react';
import api from '@/lib/api';
import PageHero from '@/components/site/PageHero';
import ShipLink from '@/components/site/ShipLink';
import ShippingCountries from '@/components/site/ShippingCountries';
import { useSiteContact } from '@/components/SiteInfoProvider';
import { telHref } from '@/lib/siteInfo';

type Step = { title: string; description: string };
type Stat = { value: string | number; label: string };

// Fallbacks used until the lists are filled in under Settings → Website content
const DEFAULT_STEPS: Step[] = [
  { title: 'Create an account', description: 'Register in minutes to unlock your shipping dashboard.' },
  { title: 'Add your items', description: 'Add one or many items to a single shipment.' },
  { title: 'Set locations', description: 'Pick from your address book or add a new address.' },
  { title: 'Review & confirm', description: 'See your instant quote and book in one click.' },
  { title: 'Track live', description: 'Follow your cargo from pickup to delivery.' },
];

const DEFAULT_FEATURES: Step[] = [
  { title: 'Instant quotes', description: 'Pricing is calculated as you add items, with no waiting for a call back.' },
  { title: 'Saved address book', description: 'Store senders and receivers once and reuse them on every booking.' },
  { title: 'Live notifications', description: 'Get updates at every milestone, from pickup to proof of delivery.' },
  { title: 'Invoices & documents', description: 'Download invoices and shipping documents straight from your dashboard.' },
  { title: 'Real support', description: 'Open a support ticket on any shipment and our team picks it up.' },
  { title: 'Secure handling', description: 'Every consignment is logged, scanned and insured in transit.' },
];

const STEP_ICONS = [UserPlus, Package, MapPin, ClipboardCheck, Radar];
const FEATURE_ICONS = [Calculator, BookUser, Bell, FileText, Headphones, ShieldCheck];

const GOODS = [
  { icon: Smartphone, label: 'Electronics' },
  { icon: Shirt, label: 'Clothing' },
  { icon: FileText, label: 'Documents' },
  { icon: Apple, label: 'Perishables' },
  { icon: Sofa, label: 'Furniture' },
  { icon: BookOpen, label: 'Books' },
  { icon: Wrench, label: 'Auto parts' },
  { icon: Pill, label: 'Medical' },
  { icon: Factory, label: 'Industrial' },
  { icon: Boxes, label: 'General cargo' },
];

const PERKS = ['Quotes in seconds', 'No paperwork to print', 'Track 24/7 from any device'];

const parseList = <T,>(raw: unknown): T[] => {
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(list) ? list : [];
  } catch { return []; }
};

export default function PortalPage() {
  const contact = useSiteContact();
  const companyName = contact.company;
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS);
  const [features, setFeatures] = useState<Step[]>(DEFAULT_FEATURES);
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    api.get('/public/settings').then(r => {
      const s = r.data?.data?.settings;
      if (!s) return;
      const st = parseList<Step>(s.landing_how_it_works).filter(x => x?.title);
      const ft = parseList<Step>(s.landing_features).filter(x => x?.title);
      const sv = parseList<Stat>(s.landing_stats).filter(x => x?.value !== undefined && x?.label);
      if (st.length) setSteps(st);
      if (ft.length) setFeatures(ft);
      setStats(sv);
    }).catch(() => { });
  }, []);

  return (
    <>
      <PageHero title="Shipping Portal" image="/site/parallax/bg-parallax3.jpg" />

      {/* ── Intro ─────────────────────────────────────────────────────── */}
      <section className="site-section">
        <div className="site-container site-grid-2 ship-portal-intro">
          <div>
            <p className="site-eyebrow">Ship Online</p>
            <h2 className="site-title">Book, manage and track shipments <span>from anywhere.</span></h2>
            <p className="site-lead">
              The {companyName} portal puts our air, sea and road network at your fingertips. Get a quote, book a pickup,
              save your addresses and follow every consignment in real time.
            </p>
            <ul className="ship-portal-perks">
              {PERKS.map(p => <li key={p}><CheckCircle size={18} /> {p}</li>)}
            </ul>
            <div className="ship-portal-actions">
              <ShipLink className="btn btn-primary btn-lg">Start a shipment <ChevronRight size={17} /></ShipLink>
              <Link href="/login" className="btn btn-secondary btn-lg">Sign in</Link>
            </div>
          </div>
          <div className="ship-portal-intro-media">
            <img src="/site/img-single/2.jpg" alt="Courier scanning a parcel at pickup" />
            <div className="ship-portal-intro-badge">
              <Radar size={22} />
              <div>
                <strong>Live tracking</strong>
                <span>Pickup to proof of delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Headline numbers (Settings → Website content) ─────────────── */}
      {stats.length > 0 && (
        <div className="ship-portal-stats">
          <div className="site-container" style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)` }}>
            {stats.map(s => (
              <div key={s.label} className="ship-portal-stat">
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Countries we ship to (same band as the landing page) ──────── */}
      <ShippingCountries />

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="site-section alt">
        <div className="site-container">
          <div className="site-center" style={{ marginBottom: '3rem' }}>
            <p className="site-eyebrow">Simple Process</p>
            <h2 className="site-title">Ship in {steps.length} <span>quick steps.</span></h2>
            <p className="site-lead">From quote to courier in under three minutes.</p>
          </div>
          <ol className="ship-portal-steps">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i % STEP_ICONS.length];
              return (
                <li key={`${i}-${step.title}`} className="ship-portal-step">
                  <div className="ship-portal-step-icon">
                    <Icon size={24} />
                    <span>{i + 1}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="site-section">
        <div className="site-container">
          <div className="site-center" style={{ marginBottom: '3rem' }}>
            <p className="site-eyebrow">Why use the portal</p>
            <h2 className="site-title">Everything you need <span>in one dashboard.</span></h2>
          </div>
          <div className="site-grid-3">
            {features.map((f, i) => {
              const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
              return (
                <div key={`${i}-${f.title}`} className="site-iconbox">
                  <div className="site-iconbox-icon"><Icon size={24} /></div>
                  <div>
                    <h3>{f.title}</h3>
                    <p>{f.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── What we ship ──────────────────────────────────────────────── */}
      <section className="site-section alt">
        <div className="site-container">
          <div className="site-center" style={{ marginBottom: '2.5rem' }}>
            <p className="site-eyebrow">What we ship</p>
            <h2 className="site-title">From delicate electronics <span>to bulk cargo.</span></h2>
          </div>
          <div className="ship-portal-goods">
            {GOODS.map(g => (
              <div key={g.label} className="ship-portal-good">
                <g.icon size={26} />
                <span>{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ──────────────────────────────────────────────────── */}
      <section className="site-band" style={{ backgroundImage: 'url(/site/parallax/bg-parallax4.jpg)' }}>
        <div className="site-container site-center">
          <h2>Ready to ship?</h2>
          <p>Join the businesses and individuals who trust {companyName} for every delivery.</p>
          <div className="ship-portal-actions" style={{ justifyContent: 'center' }}>
            <Link href="/register" className="btn btn-primary btn-lg">Create free account <ArrowRight size={17} /></Link>
            <Link href="/login" className="btn btn-outline-light btn-lg">Sign in</Link>
          </div>
          <div className="ship-portal-contact">
            {contact.phones[0] && <a href={telHref(contact.phones[0])}><Phone size={15} /> {contact.phones[0]}</a>}
            {contact.email && <a href={`mailto:${contact.email}`}><Mail size={15} /> {contact.email}</a>}
          </div>
        </div>
      </section>
    </>
  );
}
