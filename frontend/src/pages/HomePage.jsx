import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ------------------------------ Config & Data ----------------------------- */

const ROLE_DASHBOARDS = {
  admin: '/admin',
  doctor: '/doctor',
  receptionist: '/receptionist',
};

const ROLE_LABELS = {
  admin: 'Admin',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
};

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Doctors', href: '#doctors' },
  { label: 'Reviews', href: '#testimonials' },
  { label: 'Contact', href: '#contact' },
];

const STATS = [
  { value: '25+', label: 'Years of Excellence' },
  { value: '50+', label: 'Expert Doctors' },
  { value: '100K+', label: 'Patients Treated' },
  { value: '15', label: 'Departments' },
];

const SERVICES = [
  { icon: 'clipboard', title: 'General Medicine', desc: 'Complete primary care, preventive health checkups and long-term management of chronic conditions for all ages.' },
  { icon: 'activity', title: 'Cardiology', desc: 'Advanced heart care including ECG, echocardiography, angiography and structured cardiac rehabilitation.' },
  { icon: 'smile', title: 'Pediatrics', desc: 'Compassionate care for newborns, children and teenagers — from vaccinations to growth and development checks.' },
  { icon: 'layers', title: 'Diagnostics & Lab', desc: 'Full-service laboratory, digital X-ray, ultrasound, CT and MRI with fast, accurate same-day reporting.' },
  { icon: 'cpu', title: 'Neurology', desc: 'Specialized diagnosis and treatment of brain, spine and nervous system disorders with modern imaging.' },
  { icon: 'eye', title: 'Ophthalmology', desc: 'Complete vision care — eye exams, cataract surgery, LASIK evaluation and glaucoma management.' },
  { icon: 'scissors', title: 'Surgical Care', desc: 'Minimally invasive and complex procedures performed in state-of-the-art modular operating theatres.' },
  { icon: 'zap', title: '24/7 Emergency', desc: 'Round-the-clock emergency response with a fully equipped trauma and critical care unit — every day of the year.', dark: true },
];

const DOCTORS = [
  {
    name: "Dr. Meenakshi",
    role: "Senior Cardiologist",
    qual: "MD, DM (Cardiology)",
    exp: "18+ yrs",
  },
  {
    name: "Dr. Krishnan",
    role: "Paediatrician",
    qual: "MBBS, MD (Paediatrics)",
    exp: "15+ yrs",
  },
  {
    name: "Dr. Priya",
    role: "Obstetrician & Gynaecologist",
    qual: "MS (OG), DNB",
    exp: "12+ yrs",
  },
  {
    name: "Dr. Suresh ",
    role: "Orthopaedic Surgeon",
    qual: "MS (Orthopaedics)",
    exp: "14+ yrs",
  },
];

const FEATURES = [
  { icon: 'award', title: 'Expert Specialists', desc: 'A hand-picked team of 50+ board-certified doctors across 15 medical specialties.' },
  { icon: 'cpu', title: 'Advanced Technology', desc: 'Latest-generation imaging, modular operating theatres and fully digital health records.' },
  { icon: 'shield', title: 'Safe & Certified', desc: 'Internationally accredited protocols for sterilization, surgery and patient safety.' },
  { icon: 'dollar', title: 'Transparent Pricing', desc: 'Clear, upfront estimates and cashless support with all major insurance providers.' },
];

const STEPS = [
  { icon: 'calendar', title: 'Book an Appointment', desc: 'Call us or book online in under a minute — choose your specialist and a time slot that suits you.' },
  { icon: 'users', title: 'Meet Your Doctor', desc: 'Consult with a specialist who listens carefully, examines thoroughly and explains everything clearly.' },
  { icon: 'heart', title: 'Receive Personalized Care', desc: 'Get a tailored treatment plan, digital prescriptions and dedicated follow-up support.' },
];

const TESTIMONIALS = [
  {
    name: "Lakshmi Narayanan",
    tag: "Mother of Two",
    text: "The doctors never rush us through appointments. They listened to every small worry I had about my daughter's fever and treated her with so much warmth. We will not go anywhere else for our family's care.",
  },
  {
    name: "Karthikeyan",
    tag: "Cardiac Patient",
    text: "After my bypass surgery, the team called every week to check on my recovery. That kind of genuine care is very rare these days. I am back to my morning walks and forever grateful to them.",
  },
  {
    name: "Divya Chandrasekaran",
    tag: "New Mother",
    text: "From my first scan to the day I held my baby, the nurses and doctors were with me at every step. Clean rooms, kind hearts — what more can a new mother ask for?",
  },
];

const FAQS = [
  { q: 'How do I book an appointment?', a: 'You can call us at +91 98765 43210, use the Book Appointment button on this page, or simply walk in to our reception desk. Same-day slots are often available for urgent concerns.' },
  { q: 'Do you accept health insurance?', a: 'Yes. We are empanelled with all major insurers and TPAs, and offer cashless hospitalization. Just bring your insurance card and a photo ID, and our desk will handle the paperwork.' },
  { q: 'What should I bring to my first visit?', a: 'Please bring a government photo ID, any previous medical reports or prescriptions, a list of current medications, and your insurance card if applicable.' },
  { q: 'Do you offer teleconsultation?', a: 'Yes — video consultations with our specialists are available for follow-ups, report reviews and second opinions. Call our front desk to schedule a slot.' },
  { q: 'Is emergency care available on weekends and holidays?', a: 'Absolutely. Our Emergency & Trauma Department operates 24×7, 365 days a year, with doctors, diagnostics and an operating theatre always on standby.' },
];

const CONTACT_CARDS = [
  { icon: 'map-pin', title: 'Visit Us', lines: ['123 Health Street, Medical District', 'City – 500001'] },
  { icon: 'phone', title: 'Call Us', lines: ['+91 98765 43210 (Appointments)', '+91 98765 43211 (Emergency)'] },
  { icon: 'mail', title: 'Email Us', lines: ['care@healthcareclinic.com', 'support@healthcareclinic.com'] },
  { icon: 'clock', title: 'Working Hours', lines: ['Mon – Sat: 9:00 AM – 5:00 PM', 'Emergency: 24 × 7'] },
];



/* --------------------------------- Icons ---------------------------------- */

const ICONS = {
  plus: (<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>),
  activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  eye: (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>),
  users: (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  clipboard: (<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></>),
  layers: (<><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>),
  cpu: (<><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></>),
  scissors: (<><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></>),
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  smile: (<><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></>),
  clock: (<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>),
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
  mail: (<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>),
  'map-pin': (<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>),
  check: <polyline points="20 6 9 17 4 12" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  award: (<><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></>),
  calendar: (<><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>),
  'arrow-right': (<><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>),
  dollar: (<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>),
};

function Icon({ name, className = 'w-6 h-6', strokeWidth = 1.8 }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

function SectionHeading({ label, title, subtitle, dark = false }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-16 reveal">
      <span className="inline-flex items-center gap-3 text-teal-600 font-bold text-[11px] uppercase tracking-[0.35em]">
        <span className="w-8 h-[2px] bg-teal-600" />
        {label}
        <span className="w-8 h-[2px] bg-teal-600" />
      </span>
      <h2 className={`font-display text-3xl md:text-4xl font-bold mt-5 ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
      {subtitle && <p className={`mt-4 leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>}
    </div>
  );
}

/* ------------------------------- Component -------------------------------- */

export default function HomePage() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const elements = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('revealed'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-white text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        html { scroll-behavior: smooth; }
        body { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif; }
        .font-display { font-family: 'Sora', sans-serif; }
        summary::-webkit-details-marker { display: none; }
        .nav-link { position: relative; }
        .nav-link::after { content: ''; position: absolute; left: 0; bottom: -6px; height: 2px; width: 0; background: #0d9488; transition: width .3s ease; }
        .nav-link:hover::after { width: 100%; }
        .reveal { opacity: 0; transform: translateY(28px); transition: opacity .8s ease, transform .8s ease; }
        .reveal.revealed { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: .12s; }
        .reveal-delay-2 { transition-delay: .24s; }
        .hero-grid { background-image: linear-gradient(#99f6e4 1px, transparent 1px), linear-gradient(90deg, #99f6e4 1px, transparent 1px); background-size: 44px 44px; }
      `}</style>

      {/* ------------------------------- Top Bar ------------------------------ */}
      <div className="bg-slate-900 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="tel:+919876543210" className="flex items-center gap-2 hover:text-teal-400 transition-colors">
              <Icon name="phone" className="w-3.5 h-3.5 text-teal-500" /> +91 98765 43210
            </a>
            <a href="mailto:care@healthcareclinic.com" className="hidden sm:flex items-center gap-2 hover:text-teal-400 transition-colors">
              <Icon name="mail" className="w-3.5 h-3.5 text-teal-500" /> care@healthcareclinic.com
            </a>
            <span className="hidden lg:flex items-center gap-2">
              <Icon name="clock" className="w-3.5 h-3.5 text-teal-500" /> Mon – Sat: 9:00 AM – 5:00 PM
            </span>
          </div>
          <div className="flex items-center gap-3 font-semibold uppercase tracking-wider">
            {user ? (
              <Link to={ROLE_DASHBOARDS[user.role] || '/'} className="text-teal-400 hover:text-teal-300 transition-colors">
                {ROLE_LABELS[user.role]} Dashboard →
              </Link>
            ) : (
              <>
                <span className="hidden sm:inline text-slate-600 normal-case tracking-normal">Staff Access:</span>
                <Link to="/admin-login" className="hover:text-teal-400 transition-colors">Admin</Link>
                <span className="text-slate-700">|</span>
                <Link to="/doctor-login" className="hover:text-teal-400 transition-colors">Doctor</Link>
                <span className="text-slate-700">|</span>
                <Link to="/receptionist-login" className="hover:text-teal-400 transition-colors">Receptionist</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------- Navbar ------------------------------- */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <a href="#home" className="flex items-center gap-3">
              <div className="w-11 h-11 bg-teal-600 flex items-center justify-center">
                <Icon name="plus" className="w-6 h-6 text-white" strokeWidth={3} />
              </div>
              <div className="leading-none">
                <span className="font-display font-bold text-xl text-slate-900">HealthCare</span>
                <span className="font-display font-bold text-xl text-teal-600"> Clinic</span>
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 mt-1.5">Trust · Care · Excellence</p>
              </div>
            </a>

            <nav className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((l) => (
                <a key={l.label} href={l.href} className="nav-link text-sm font-semibold text-slate-600 hover:text-teal-600 transition-colors">
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {user ? (
                <Link
                  to={ROLE_DASHBOARDS[user.role] || '/'}
                  className="hidden sm:inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Dashboard
                  <span className="bg-teal-500 px-2 py-0.5 text-[10px]">{ROLE_LABELS[user.role]}</span>
                </Link>
              ) : (
                <a
                  href="#appointment"
                  className="hidden sm:inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Book Appointment <Icon name="arrow-right" className="w-4 h-4" />
                </a>
              )}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden w-11 h-11 flex items-center justify-center border border-slate-200 text-slate-700"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {menuOpen ? (
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block py-3 text-sm font-semibold text-slate-700 hover:text-teal-600 border-b border-slate-50"
              >
                {l.label}
              </a>
            ))}
            {user ? (
              <Link
                to={ROLE_DASHBOARDS[user.role] || '/'}
                onClick={() => setMenuOpen(false)}
                className="block mt-4 bg-teal-600 text-white text-center py-3 text-xs font-bold uppercase tracking-widest"
              >
                {ROLE_LABELS[user.role]} Dashboard
              </Link>
            ) : (
              <div className="grid grid-cols-3 gap-2 mt-4">
                <Link to="/admin-login" className="text-center py-3 border border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-600">Admin</Link>
                <Link to="/doctor-login" className="text-center py-3 border border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-600">Doctor</Link>
                <Link to="/receptionist-login" className="text-center py-3 border border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-600">Receptionist</Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* -------------------------------- Hero -------------------------------- */}
      <section id="home" className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-slate-50">
        <div className="absolute inset-0 hero-grid opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_75%)] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <span className="inline-flex items-center gap-2 bg-white border border-teal-200 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] text-teal-700">
              <span className="w-2 h-2 bg-teal-500" /> Trusted Healthcare Since 1998
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] mt-6">
              Exceptional Care for a <span className="text-teal-600">Healthier Tomorrow</span>
            </h1>
            <p className="text-lg text-slate-500 mt-6 max-w-xl leading-relaxed">
              From routine checkups to complex surgeries, our 50+ specialists combine advanced medical
              technology with genuine compassion — because your family deserves nothing less.
            </p>

            <div className="flex flex-wrap gap-4 mt-10">
              {user ? (
                <>
                  <Link
                    to={ROLE_DASHBOARDS[user.role] || '/'}
                    className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-600/25"
                  >
                    Go to {ROLE_LABELS[user.role]} Dashboard <Icon name="arrow-right" className="w-4 h-4" />
                  </Link>
                  <a href="#services" className="inline-flex items-center gap-2 border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all">
                    Our Services
                  </a>
                </>
              ) : (
                <>
                  <a href="#appointment" className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-600/25">
                    Book an Appointment <Icon name="arrow-right" className="w-4 h-4" />
                  </a>
                  <a href="#doctors" className="inline-flex items-center gap-2 border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all">
                    Meet Our Doctors
                  </a>
                </>
              )}
            </div>

            <div className="flex items-center gap-5 mt-12">
              <div className="flex -space-x-3">
                {['men/32', 'women/44', 'men/75', 'women/68'].map((u) => (
                  <img key={u} src={`https://randomuser.me/api/portraits/${u}.jpg`} alt="Patient" className="w-11 h-11 object-cover border-2 border-white shadow-sm" />
                ))}
              </div>
              <div>
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Rated <span className="font-bold text-slate-900">4.9/5</span> by 100,000+ patients
                </p>
              </div>
            </div>
          </div>

          <div className="relative reveal reveal-delay-1">
            <div className="absolute -top-5 -left-5 w-full h-full border-2 border-teal-600 hidden sm:block" />
            <img
              src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=80"
              alt="Doctor caring for a patient"
              className="relative w-full h-[420px] lg:h-[560px] object-cover"
            />
            <div className="absolute -left-4 lg:-left-10 top-12 z-10 hidden sm:flex items-center gap-4 bg-white border-l-4 border-teal-600 shadow-2xl px-5 py-4">
              <div className="w-11 h-11 bg-teal-50 text-teal-600 flex items-center justify-center">
                <Icon name="zap" className="w-6 h-6" />
              </div>
              <div>
                <p className="font-display font-bold text-slate-900 text-sm">24/7 Emergency</p>
                <p className="text-xs text-slate-500">Immediate response team</p>
              </div>
            </div>
            <div className="absolute -bottom-8 right-4 lg:right-8 z-10 flex items-center gap-4 bg-slate-900 text-white shadow-2xl px-6 py-5">
              <span className="font-display text-4xl font-bold text-teal-400">25+</span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-slate-300 leading-relaxed">
                Years of<br />Excellence
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------- Stats -------------------------------- */}
      <section className="bg-slate-900 border-b-4 border-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={s.label} className={`py-10 lg:py-12 px-4 text-center reveal ${i > 0 ? 'lg:border-l lg:border-white/10' : ''}`}>
              <div className="font-display text-4xl lg:text-5xl font-bold text-teal-400">{s.value}</div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------ Services ------------------------------ */}
      <section id="services" className="py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Our Services"
            title="Comprehensive Care Under One Roof"
            subtitle="From everyday checkups to life-changing surgeries, every department is equipped with the latest technology and led by senior specialists."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((s) => (
              <div
                key={s.title}
                className={`group relative p-8 border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-900/10 reveal ${s.dark ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200 hover:border-teal-600'
                  }`}
              >
                <div className={`w-14 h-14 flex items-center justify-center transition-colors ${s.dark ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white'}`}>
                  <Icon name={s.icon} className="w-7 h-7" />
                </div>
                <h3 className={`font-display font-bold text-lg mt-6 ${s.dark ? 'text-white' : 'text-slate-900'}`}>{s.title}</h3>
                <p className={`text-sm leading-relaxed mt-2 ${s.dark ? 'text-slate-400' : 'text-slate-500'}`}>{s.desc}</p>
                <span className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mt-6 ${s.dark ? 'text-teal-400' : 'text-teal-600'}`}>
                  Learn More <Icon name="arrow-right" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------- About ------------------------------- */}
      <section id="about" className="py-24 bg-slate-50 scroll-mt-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          <div className="relative reveal">
            <img
              src="https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=800&q=80"
              alt="Doctor consulting a patient"
              className="w-full h-[440px] lg:h-[520px] object-cover"
            />
            <img
              src="https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=600&q=80"
              alt="Surgical team at work"
              className="absolute -bottom-10 -right-2 sm:-right-10 w-52 h-64 object-cover border-8 border-slate-50 hidden sm:block"
            />
            <div className="absolute top-6 -left-2 sm:-left-6 bg-teal-600 text-white px-6 py-5 shadow-xl">
              <p className="font-display text-3xl font-bold">25+</p>
              <p className="text-[10px] uppercase tracking-[0.2em] mt-1">Years of Service</p>
            </div>
          </div>

          <div className="reveal reveal-delay-1 lg:pt-4">
            <span className="inline-flex items-center gap-3 text-teal-600 font-bold text-[11px] uppercase tracking-[0.35em]">
              <span className="w-8 h-[2px] bg-teal-600" /> About Our Clinic
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mt-5 leading-tight">
              A Legacy of Compassionate Healing
            </h2>
            <p className="text-slate-500 leading-relaxed mt-6">
              Founded in 1998, HealthCare Clinic began as a two-room practice with a single promise:
              world-class care, close to home. Today we are a multi-specialty hospital serving more
              than 100,000 patients a year — and that promise hasn't changed.
            </p>
            <p className="text-slate-500 leading-relaxed mt-4">
              Every treatment plan here is built around one person: you. Our specialists work as one
              team, your records live in one secure digital system, and your care is never handed
              off to a stranger.
            </p>

            <ul className="grid sm:grid-cols-2 gap-4 mt-8">
              {['50+ board-certified specialists', 'NABH-accredited facilities', 'Same-day appointments available', 'Dedicated patient care coordinators'].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="check" className="w-4 h-4" strokeWidth={3} />
                  </span>
                  <span className="text-slate-700 font-medium text-sm">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 border-l-4 border-teal-600 pl-6">
              <p className="text-slate-600 italic leading-relaxed">
                “Every patient who walks through our doors is family. That has been our promise for
                25 years — and it always will be.”
              </p>
              <p className="mt-3 font-bold text-slate-900">Dr. Sarah Mitchell</p>
              <p className="text-[11px] uppercase tracking-[0.25em] text-teal-600 font-semibold mt-1">Chief Medical Director</p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------- Why Choose Us --------------------------- */}
      <section className="relative py-24 bg-slate-900 overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 border-t-2 border-r-2 border-teal-600/30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 border-b-2 border-l-2 border-teal-600/30 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <span className="inline-flex items-center gap-3 text-teal-400 font-bold text-[11px] uppercase tracking-[0.35em]">
              <span className="w-8 h-[2px] bg-teal-400" /> Why Choose Us
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mt-5 leading-tight">
              The HealthCare Clinic Difference
            </h2>
            <p className="text-slate-400 leading-relaxed mt-6">
              We've spent 25 years perfecting the details that make care better — from the first
              phone call to the final follow-up.
            </p>
            <div className="grid sm:grid-cols-2 gap-8 mt-10">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <div className="w-12 h-12 bg-teal-600/10 text-teal-400 flex items-center justify-center">
                    <Icon name={f.icon} className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-white mt-4">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mt-2">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative reveal reveal-delay-1">
            <div className="absolute -bottom-5 -right-5 w-full h-full border-2 border-teal-600 hidden sm:block" />
            <img
              src="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80"
              alt="Advanced medical laboratory"
              className="relative w-full h-[420px] lg:h-[520px] object-cover"
            />
            <div className="absolute top-6 left-6 bg-white shadow-2xl px-5 py-4 border-l-4 border-teal-600">
              <p className="font-display font-bold text-slate-900 text-sm">ISO 9001:2015</p>
              <p className="text-xs text-slate-500 mt-0.5">Certified Quality Care</p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------- Doctors ------------------------------- */}
      <section id="doctors" className="py-24 bg-white scroll-mt-20">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <SectionHeading
      label="Our Doctors"
      title="Specialists You Can Trust"
      subtitle="Meet the experts who make it all possible — leaders in their fields, and neighbours in your community."
    />
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {DOCTORS.map((d) => (
        <div key={d.name} className="group border border-slate-200 hover:border-teal-600 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-900/10 reveal">
          <div className="relative overflow-hidden h-72 bg-gradient-to-br from-teal-50 to-slate-100 flex items-center justify-center">
            {/* User Icon instead of image */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-32 h-32 text-teal-600/40 transition-transform duration-700 group-hover:scale-110"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>

            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
              <a href="#appointment" className="block bg-teal-600 hover:bg-teal-700 text-white text-center py-3 text-xs font-bold uppercase tracking-widest">
                Book Consultation
              </a>
            </div>
          </div>
          <div className="p-6 border-t-2 border-teal-600">
            {/* Tamil name written in English */}
            <h3 className="font-display font-bold text-slate-900">{d.name}</h3>
            <p className="text-teal-600 text-sm font-semibold mt-1">{d.role}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>

      {/* --------------------- Appointment Steps + CTA Banner ------------------- */}
      <section id="appointment" className="py-24 bg-slate-50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Get Started"
            title="Booking Your Visit Is Simple"
            subtitle="No queues, no confusion — just three quick steps between you and expert care."
          />
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative bg-white border border-slate-200 p-8 hover:border-teal-600 transition-colors overflow-hidden reveal">
                <span className="absolute top-5 right-6 font-display text-7xl font-extrabold text-slate-100 select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="relative">
                  <div className="w-14 h-14 bg-teal-600 text-white flex items-center justify-center">
                    <Icon name={s.icon} className="w-7 h-7" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-slate-900 mt-6">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mt-2">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Banner */}
          <div className="relative mt-20 reveal">
            <img
              src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-teal-900/95 to-slate-900/95" />
            <div className="relative px-8 py-14 lg:px-16 lg:py-20 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
              <div className="text-white">
                <h2 className="font-display text-3xl lg:text-4xl font-bold">Your Health Can't Wait.</h2>
                <p className="text-slate-300 mt-3 max-w-xl leading-relaxed">
                  Same-week appointments are available now. Speak to our care team today and take
                  the first step toward feeling better.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 shrink-0 w-full sm:w-auto">
                <a
                  href="tel:+919876543210"
                  className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-8 py-4 text-sm font-bold uppercase tracking-widest transition-colors"
                >
                  <Icon name="phone" className="w-4 h-4" /> Call Now
                </a>
                {user ? (
                  <Link
                    to={ROLE_DASHBOARDS[user.role] || '/'}
                    className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-8 py-4 text-sm font-bold uppercase tracking-widest transition-colors"
                  >
                    My Dashboard
                  </Link>
                ) : (
                  <a
                    href="#contact"
                    className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-8 py-4 text-sm font-bold uppercase tracking-widest transition-colors"
                  >
                    Contact Us
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------- Testimonials ---------------------------- */}
      <section id="testimonials" className="py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Patient Stories"
            title="Trusted by Families Like Yours"
            subtitle="Real experiences from the people we're honoured to care for every day."
          />
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-slate-50 border border-slate-200 p-8 hover:border-teal-600 hover:bg-white transition-all duration-300 reveal"
              >
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 leading-relaxed mt-5 text-sm">“{t.text}”</p>
                <div className="flex items-center gap-4 mt-6 pt-6 border-t border-slate-200">
                  {/* User icon avatar */}
                  <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-teal-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-teal-600 text-xs font-semibold mt-0.5">{t.tag}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------- FAQ --------------------------------- */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading label="Good to Know" title="Frequently Asked Questions" />
          <div className="max-w-3xl mx-auto space-y-4">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group bg-white border border-slate-200 hover:border-teal-600 transition-colors reveal">
                <summary className="flex items-center justify-between cursor-pointer list-none px-6 py-5 font-semibold text-slate-900">
                  {faq.q}
                  <span className="text-teal-600 transition-transform duration-300 group-open:rotate-45 shrink-0 ml-4">
                    <Icon name="plus" className="w-5 h-5" strokeWidth={2.5} />
                  </span>
                </summary>
                <p className="px-6 pb-6 text-sm text-slate-500 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------- Contact ------------------------------- */}
      <section id="contact" className="py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Contact"
            title="We're Here When You Need Us"
            subtitle="Visit us, call us, or drop a message — our care team responds within one business day."
          />
          <div className="grid lg:grid-cols-2 gap-12 items-stretch">
            <div className="grid sm:grid-cols-2 gap-6 reveal">
              {CONTACT_CARDS.map((c) => (
                <div key={c.title} className="border border-slate-200 p-7 hover:border-teal-600 transition-colors">
                  <div className="w-12 h-12 bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Icon name={c.icon} className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-slate-900 mt-5">{c.title}</h3>
                  {c.lines.map((line) => (
                    <p key={line} className="text-sm text-slate-500 mt-1.5">{line}</p>
                  ))}
                </div>
              ))}
            </div>

            <div className="relative reveal reveal-delay-1 min-h-[380px]">
              <div className="absolute -top-4 -right-4 w-full h-full border-2 border-teal-600 hidden sm:block" />
              <img
                src="https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80"
                alt="HealthCare Clinic building"
                className="relative w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 px-6 py-5 flex items-center justify-between">
                <div>
                  <p className="text-white font-display font-bold">Emergency Department</p>
                  <p className="text-slate-400 text-xs mt-0.5">Open 24 hours · Every day</p>
                </div>
                <a
                  href="tel:+919876543210"
                  className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  <Icon name="phone" className="w-3.5 h-3.5" /> Call
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------- Footer ------------------------------- */}
      <footer className="bg-slate-950 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 flex items-center justify-center">
                <Icon name="plus" className="w-5 h-5 text-white" strokeWidth={3} />
              </div>
              <span className="font-display font-bold text-lg text-white">HealthCare <span className="text-teal-400">Clinic</span></span>
            </div>
            <p className="text-sm leading-relaxed mt-5">
              World-class medical care with a human touch — serving our community with trust,
              technology and compassion since 1998.
            </p>
            <div className="flex gap-2 mt-6">
              {['Fb', 'Tw', 'In', 'Yt'].map((s) => (
                <a key={s} href="#home" className="w-10 h-10 border border-slate-800 hover:bg-teal-600 hover:border-teal-600 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition-colors">
                  {s}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-white text-sm uppercase tracking-widest">Quick Links</h4>
            <ul className="mt-5 space-y-3 text-sm">
              {NAV_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="hover:text-teal-400 transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white text-sm uppercase tracking-widest">Our Services</h4>
            <ul className="mt-5 space-y-3 text-sm">
              {SERVICES.slice(0, 6).map((s) => (
                <li key={s.title}>
                  <a href="#services" className="hover:text-teal-400 transition-colors">{s.title}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white text-sm uppercase tracking-widest">Contact</h4>
            <ul className="mt-5 space-y-4 text-sm">
              <li className="flex gap-3">
                <Icon name="map-pin" className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                123 Health Street, Medical District, City – 500001
              </li>
              <li className="flex gap-3">
                <Icon name="phone" className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                +91 98765 43210
              </li>
              <li className="flex gap-3">
                <Icon name="mail" className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                care@healthcareclinic.com
              </li>
              <li className="flex gap-3">
                <Icon name="clock" className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                Mon – Sat: 9:00 AM – 5:00 PM
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <p>© 2026 HealthCare Clinic. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#home" className="hover:text-teal-400 transition-colors">Privacy Policy</a>
              <a href="#home" className="hover:text-teal-400 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}