'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Package, Truck, Globe, Shield, Clock, CheckCircle, ArrowRight,
  Star, MapPin, BarChart3, Zap, ChevronDown, Phone, Mail, Sparkles, ArrowLeft
} from 'lucide-react';
import api from '@/lib/api';

const CITIES = ['Nairobi', 'London', 'New York', 'Dubai', 'Singapore', 'Johannesburg', 'Lagos', 'Paris', 'Tokyo', 'Toronto', 'Sydney', 'Mumbai', 'Amsterdam', 'Doha'];

const IconMap: Record<string, any> = {
  Package, Truck, Globe, Shield, Clock, CheckCircle, ArrowRight,
  Star, MapPin, BarChart3, Zap, Phone, Mail, Sparkles, ArrowLeft,
  Headphones: Globe // Fallback
};
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [settings, setSettings] = useState<any>({
    company_name: 'Global Air Cargo',
    company_email: 'hello@globalaircargo.com',
    company_phone: '+254 700 000 000',
    landing_how_it_works: [],
    landing_features: [],
    landing_stats: [],
  });

  const [slides, setSlides] = useState<any[]>([
    {
      id: 1,
      title: 'Bulk Cargo Handling',
      subtitle: 'The road transport industry is the backbone of strong economies and dynamic societies.',
      image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=2070&auto=format&fit=crop',
      cta: 'Read More',
      cta_link: '#'
    }
  ]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [destinations, setDestinations] = useState<string[]>(CITIES);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 150);
    window.addEventListener('scroll', onScroll);
    
    // Fetch settings
    api.get('/public/settings').then(r => {
      if (r.data?.data?.settings) {
        const s = r.data.data.settings;
        const parsed: any = { ...s };
        ['landing_how_it_works', 'landing_features', 'landing_stats'].forEach(k => {
          if (s[k]) {
            try { parsed[k] = JSON.parse(s[k]); } catch { }
          }
        });
        setSettings((prev: any) => ({ ...prev, ...parsed }));
      }
    }).catch(() => { });

    // Fetch slides
    api.get('/public/slides').then(r => {
      if (r.data.data && r.data.data.length > 0) {
        setSlides(r.data.data.map((s: any) => ({
          id: s.id,
          title: s.title,
          subtitle: s.subtitle,
          image: s.image_url,
          cta: s.cta_text || 'Get Started',
          cta_link: s.cta_link || '/register'
        })));
      }
    }).catch(() => { });

    // Fetch real locations for marquee
    api.get('/locations/hierarchy').then(r => {
      if (r.data?.data?.destinations) {
        const cities: string[] = [];
        r.data.data.destinations.forEach((country: any) => {
          if (country.cities && country.cities.length > 0) {
            country.cities.forEach((c: any) => cities.push(c.name));
          } else {
            cities.push(country.name);
          }
        });
        if (cities.length > 0) setDestinations(cities);
      }
    }).catch(() => { });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>

      {/* ── Top Bar (Dark) ─────────────────────────────────────────────────── */}
      <div style={{ background: '#222831', color: 'white', padding: '0.6rem 0', fontSize: '0.75rem', fontWeight: 500 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span>Have any questions?</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 22, height: 22, background: '#3b82f6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={12} color="white" />
              </div>
              <span style={{ opacity: 0.8 }}>{settings.company_email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 22, height: 22, background: '#3b82f6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={12} color="white" />
              </div>
              <span style={{ opacity: 0.8 }}>Bruce House, Ground Floor, Nairobi, Kenya</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 22, height: 22, background: '#3b82f6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={12} color="white" />
              </div>
              <span style={{ opacity: 0.8 }}>{settings.company_phone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Header (Logo + Menu) ─────────────────────────────────────────── */}
      <header style={{ background: 'white', padding: '1rem 0', borderBottom: '1px solid #eee', position: scrolled ? 'fixed' : 'relative', top: 0, left: 0, right: 0, zIndex: 1000, boxShadow: scrolled ? '0 2px 10px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.3s ease' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <img src="/logo-transparent.png" alt="Global Air Cargo" style={{ height: '50px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
             <a href="https://globalaircargoke.net/" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ArrowLeft size={14} /> Main Website
             </a>
             <Link href="/track" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>Track Order</Link>
             <Link href="/login" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>Sign In</Link>
             <Link href="/register" style={{ color: 'white', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700, background: '#e2343a', padding: '0.6rem 1.25rem', borderRadius: 4 }}>Register</Link>
          </nav>
        </div>
      </header>

      {/* ── Sub-page Hero Banner ─────────────────────────────────────────── */}
      <section style={{ height: '300px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1 }} />
        <img src="https://images.unsplash.com/photo-1580674285054-bed31e145f59?q=80&w=2070&auto=format&fit=crop" alt="Shipping Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 10%', zIndex: 2 }}>
           <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
              <h1 style={{ color: 'white', fontSize: '3rem', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>Shipping Portal</h1>
           </div>
        </div>
      </section>

      {/* ── Breadcrumbs ──────────────────────────────────────────────────── */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #eee', padding: '0.75rem 0' }}>
         <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <MapPin size={14} />
            <span>You are here:</span>
            <Link href="/" style={{ color: '#e2343a', textDecoration: 'none' }}>Home</Link>
            <span>/</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Shipping Portal</span>
         </div>
      </div>

      {/* ── Destinations Marquee ─────────────────────────────────────────── */}
      <div style={{ background: 'rgba(59,130,246,0.05)', borderTop: '1px solid rgba(59,130,246,0.1)', borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '0.875rem 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '3rem', whiteSpace: 'nowrap', animation: 'marquee 35s linear infinite' }}>
          {[...destinations, ...destinations].map((city, i) => (
            <span key={i} style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              <MapPin size={12} color="#3b82f6" /> {city}
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '6rem 2rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.78rem', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Simple Process</p>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '0.75rem' }}>Ship in 5 Quick Steps</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>From quote to courier in under 3 minutes.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${settings.landing_how_it_works?.length || 5}, 1fr)`, gap: '0', position: 'relative' }}>
            {/* Connector line */}
            <div style={{ position: 'absolute', top: 28, left: '10%', right: '10%', height: 2, background: 'var(--accent)', opacity: 0.15, zIndex: 0 }} />

            {(settings.landing_how_it_works?.length > 0 ? settings.landing_how_it_works : [
              { id: 1, title: 'Create Account', description: 'Register to access your dashboard', icon: 'UserPlus' },
              { id: 2, title: 'Add Items', description: 'Add multiple items to a single shipment', icon: 'Package' },
              { id: 3, title: 'Set Locations', description: 'Choose from address book or add new', icon: 'MapPin' },
              { id: 4, title: 'Review & Confirm', description: 'See your instant quote and book', icon: 'Check' },
              { id: 5, title: 'Track Live', description: 'Monitor from pickup to delivery', icon: 'Search' },
            ]).map((step: any, idx: number) => (
              <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 0.75rem', position: 'relative', zIndex: 1 }}>
                {/* Circle */}
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', marginBottom: '1rem',
                  background: idx === 0 ? 'var(--accent)' : 'var(--bg-card)',
                  border: idx === 0 ? 'none' : '2px solid var(--border-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', boxShadow: idx === 0 ? '0 0 20px rgba(59,130,246,0.4)' : 'none',
                  flexShrink: 0, color: idx === 0 ? 'white' : 'inherit'
                }}>
                  {step.icon === 'Package' && <Package size={24} />}
                  {step.icon === 'Truck' && <Truck size={24} />}
                  {step.icon === 'Globe' && <Globe size={24} />}
                  {step.icon === 'Shield' && <Shield size={24} />}
                  {step.icon === 'MapPin' && <MapPin size={24} />}
                  {!['Package', 'Truck', 'Globe', 'Shield', 'MapPin'].includes(step.icon) && <span>{step.emoji || '📦'}</span>}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: idx === 0 ? '#3b82f6' : 'rgba(59,130,246,0.15)', fontSize: '0.65rem', fontWeight: 800, color: idx === 0 ? '#fff' : '#60a5fa', marginBottom: '0.6rem' }}>{idx + 1}</div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.3rem', color: idx === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{step.title}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.775rem', lineHeight: 1.5 }}>{step.description}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link href="/register" className="btn btn-secondary">
              No account yet? Create one free →
            </Link>
          </div>
        </div>
      </section>


      {/* ── What We Ship ─────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '4rem 2rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 800, marginBottom: '0.5rem' }}>We Ship Everything</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>From delicate electronics to bulk industrial goods</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.875rem' }}>
            {[['📱', 'Electronics'], ['👗', 'Clothing'], ['📄', 'Documents'], ['🥦', 'Perishables'], ['🛋️', 'Furniture'], ['📚', 'Books'], ['🔧', 'Auto Parts'], ['💊', 'Medical'], ['⚙️', 'Industrial'], ['📦', 'General']].map(([e, l]) => (
              <div key={l} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 0.5rem', textAlign: 'center', transition: 'all 0.2s' }}
                onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (ev.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'; }}
                onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (ev.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>{e}</div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>




      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '7rem 2rem', textAlign: 'center', background: 'radial-gradient(ellipse at 50% 0%, rgba(15,64,152,0.06) 0%, var(--bg-secondary) 60%)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', width: 64, height: 64, borderRadius: 18, background: 'var(--accent)', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 0 40px rgba(15,64,152,0.15)' }}>
            <Truck size={28} color="white" />
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, marginBottom: '1rem', lineHeight: 1.1 }}>Ready to Ship?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            Join thousands of businesses and individuals who trust {settings.company_name} for every delivery.
          </p>
          <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn btn-primary" style={{ padding: '0.9rem 2.25rem', fontSize: '1rem', fontWeight: 700, boxShadow: '0 4px 24px rgba(59,130,246,0.4)' }}>
              Create Free Account <ArrowRight size={17} />
            </Link>
            <Link href="/login" className="btn btn-secondary" style={{ padding: '0.9rem 2.25rem', fontSize: '1rem' }}>
              Sign In
            </Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginTop: '3rem', flexWrap: 'wrap' }}>
            <a href={`tel:${settings.company_phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              <Phone size={15} color="#3b82f6" /> {settings.company_phone}
            </a>
            <a href={`mailto:${settings.company_email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              <Mail size={15} color="#3b82f6" /> {settings.company_email}
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ background: '#05080f', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '2rem 2.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <img src="/logo.png" alt="Logo" style={{ height: 32, objectFit: 'contain' }} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>© {new Date().getFullYear()} {settings.company_name}. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {['Privacy', 'Terms', 'Cookies'].map(l => (
              <a key={l} href="#" style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
