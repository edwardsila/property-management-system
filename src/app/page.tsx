import Image from "next/image";
import Link from "next/link";
import ContactForm from "@/components/contact-form";

const services = [
  {
    title: "Property Management",
    description:
      "We run your rentals end to end: tenant placement, rent collection, inspections, and reporting — so your units never sit idle.",
  },
  {
    title: "Professional Cleaning",
    description:
      "Residential and commercial cleaning, plus thorough move-in and move-out deep cleans by vetted, insured teams.",
  },
  {
    title: "Tenant Vetting",
    description:
      "Every applicant is background-checked and credit-checked before they sign, so you get reliable tenants who pay on time.",
  },
  {
    title: "Maintenance & Repairs",
    description:
      "One call and we handle it. A network of trusted handymen keeps your property in shape and your tenants happy.",
  },
];

const properties = [
  {
    name: "Sunrise Court Apartments",
    location: "Westlands, Nairobi",
    detail: "2-bedroom",
    rent: "KES 45,000 / month",
    gradient: "from-navy via-navy-dark to-leaf",
    image: "/images/property-sunrise-court.jpg",
  },
  {
    name: "Green Ridge Bungalow",
    location: "Lavington, Nairobi",
    detail: "3-bedroom",
    rent: "KES 80,000 / month",
    gradient: "from-leaf via-leaf-dark to-navy-dark",
  },
  {
    name: "Terava Heights",
    location: "Kilimani, Nairobi",
    detail: "1-bedroom",
    rent: "KES 32,000 / month",
    gradient: "from-navy-darker via-navy to-leaf-dark",
  },
];

const reasons = [
  {
    title: "On-time rent collection",
    description: "Consistent, trackable rent collection so your income arrives when it should.",
  },
  {
    title: "Transparent monthly reports",
    description: "Clear statements for every unit — what came in, what went out, and what is owed.",
  },
  {
    title: "Properties that stay full",
    description: "Proactive marketing and fast tenant placement keep your occupancy high.",
  },
  {
    title: "A single point of contact",
    description: "One team handles management and cleaning, so you never chase multiple people.",
  },
];

function LogoMark({ className = "", light = false }: { className?: string; light?: boolean }) {
  const navy = light ? "#ffffff" : "#1b3a66";
  const leaf = light ? "#7fd6a4" : "#1f8a4c";
  const gold = light ? "#e8c458" : "#d4a72c";
  const houseFill = light ? "rgba(255,255,255,0.06)" : "#ffffff";
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <circle cx="30" cy="66" r="7" fill={gold} />
      <circle cx="30" cy="80" r="7" fill={leaf} />
      <path
        d="M48 8 12 40v46h72V40L48 8Z"
        fill={houseFill}
        stroke={navy}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect x="38" y="46" width="11" height="11" fill={navy} />
      <rect x="53" y="46" width="11" height="11" fill={navy} />
      <rect x="45" y="72" width="10" height="14" rx="1" fill={navy} />
      <g transform="rotate(-32 74 58)">
        <circle cx="66" cy="58" r="8" fill="none" stroke={leaf} strokeWidth="5" />
        <rect x="70" y="54" width="18" height="6" fill={leaf} />
        <rect x="80" y="54" width="6" height="10" fill={leaf} />
        <rect x="88" y="54" width="6" height="8" fill={leaf} />
      </g>
    </svg>
  );
}

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="leading-none">
      <span
        className={`block text-2xl font-extrabold uppercase tracking-tight ${light ? "text-white" : "text-navy"}`}
      >
        Terava
      </span>
      <span
        className={`block text-sm font-bold uppercase tracking-[0.22em] ${light ? "text-white/80" : "text-navy"}`}
      >
        Properties
      </span>
      <span className={`mt-1.5 block text-xs font-bold ${light ? "text-white/90" : "text-navy"}`}>
        We Manage. <span className={light ? "text-[#7fd6a4]" : "text-leaf"}>You Earn.</span>
      </span>
    </span>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4 sm:px-10 lg:px-12">
          <Link href="#home" className="flex items-center gap-3">
            <LogoMark className="h-11 w-11 shrink-0" />
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#services" className="transition hover:text-navy">
              Services
            </a>
            <a href="#properties" className="transition hover:text-navy">
              Properties
            </a>
            <a href="#why" className="transition hover:text-navy">
              Why Terava
            </a>
          </nav>
          <a
            href="#contact"
            className="rounded-full bg-leaf px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-leaf-dark"
          >
            Contact us
          </a>
        </div>
      </header>

      <section id="home" className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-navy-light blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-leaf/10 blur-3xl"
        />
        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-12 lg:py-24">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center rounded-full border border-navy/10 bg-navy-light px-4 py-2 text-sm font-semibold text-navy">
              Terava Property Management &amp; Cleaning Services
            </span>
            <h1 className="text-5xl font-extrabold leading-[0.95] tracking-tight text-navy sm:text-6xl lg:text-7xl">
              We Manage.
              <br />
              <span className="text-leaf">You Earn.</span>
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-600">
              Terava keeps your rentals full, your properties spotless, and your income on time —
              so you can sit back and earn.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#properties"
                className="rounded-full bg-leaf px-6 py-3 text-sm font-semibold text-white transition hover:bg-leaf-dark"
              >
                View properties
              </a>
              <a
                href="#services"
                className="rounded-full border border-navy/20 bg-white px-6 py-3 text-sm font-semibold text-navy transition hover:border-navy"
              >
                Explore services
              </a>
            </div>
            <div className="mt-2">
              <p className="relative w-fit text-sm font-semibold text-navy">
                Reliable Property Management You Can Trust
                <span className="absolute -bottom-2 left-0 h-1 w-16 rounded-full bg-leaf" />
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-4 shadow-[0_30px_80px_rgba(27,58,102,0.18)] ring-1 ring-slate-100">
            <div className="relative h-64 overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy-dark to-leaf sm:h-72">
              <Image
                src="/images/property-sunrise-court.jpg"
                alt="Sunrise Court Apartments, Westlands, Nairobi"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="absolute inset-0 object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-navy-darker/90 via-navy-darker/30 to-transparent"
              />
              <span className="absolute left-5 top-5 rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-wide text-navy-darker">
                Featured
              </span>
              <div className="absolute inset-x-5 bottom-5">
                <p className="text-2xl font-bold text-white">Sunrise Court Apartments</p>
                <p className="mt-1 text-sm text-white/70">Westlands, Nairobi</p>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100 py-5 text-center">
              <div className="px-2">
                <p className="text-lg font-bold text-navy">98%</p>
                <p className="text-xs text-slate-500">Occupancy</p>
              </div>
              <div className="px-2">
                <p className="text-lg font-bold text-navy">KES 45k</p>
                <p className="text-xs text-slate-500">2-bed / month</p>
              </div>
              <div className="px-2">
                <p className="text-lg font-bold text-navy">24h</p>
                <p className="text-xs text-slate-500">Maintenance</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="bg-navy-light/60 py-20">
        <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-12">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold uppercase tracking-[0.24em] text-leaf">What we do</span>
            <h2 className="max-w-2xl text-4xl font-extrabold tracking-tight text-navy">
              Everything your property needs, handled by one trusted team.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {services.map((service) => (
              <article key={service.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-white">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 11.5 12 4l9 7.5" />
                    <path d="M5.5 10v9.5h13V10" />
                  </svg>
                </span>
                <h3 className="mt-5 text-lg font-bold text-navy">{service.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{service.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="properties" className="py-20">
        <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-12">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold uppercase tracking-[0.24em] text-leaf">Featured properties</span>
            <h2 className="max-w-2xl text-4xl font-extrabold tracking-tight text-navy">
              Prime rental homes, fully managed for you.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {properties.map((property) => (
              <article key={property.name} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
                <div className={`relative h-56 ${property.image ? "overflow-hidden" : `bg-gradient-to-br ${property.gradient}`}`}>
                  {property.image ? (
                    <Image
                      src={property.image}
                      alt={property.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="absolute inset-0 object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="absolute -left-8 -top-8 h-40 w-40 rounded-full border border-white/15"
                    />
                  )}
                  <span className="absolute left-4 top-4 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">
                    For rent
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-navy">{property.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{property.location}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-sm font-semibold text-slate-600">{property.detail}</span>
                    <span className="text-sm font-bold text-leaf">{property.rent}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="bg-navy py-20 text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-12">
          <div>
            <span className="text-sm font-bold uppercase tracking-[0.24em] text-gold">Why Terava</span>
            <h2 className="mt-3 max-w-xl text-4xl font-extrabold tracking-tight">
              We Manage. <span className="text-[#7fd6a4]">You Earn.</span>
            </h2>
            <div className="mt-8 space-y-6">
              {reasons.map((reason) => (
                <div key={reason.title} className="flex gap-4">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="font-bold text-white">{reason.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/70">{reason.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
            <LogoMark className="h-16 w-16" light />
            <p className="mt-6 text-xl font-semibold leading-8 text-white/90">
              &ldquo;Reliable Property Management You Can Trust.&rdquo;
            </p>
            <span className="mt-3 block h-1 w-16 rounded-full bg-leaf" />
          </div>
        </div>
      </section>

      <section id="contact" className="py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
          <div>
            <span className="text-sm font-bold uppercase tracking-[0.24em] text-leaf">Get in touch</span>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-navy">
              Ready to put your property to work?
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Whether you own one unit or an entire estate, or you need a reliable cleaning team,
              Terava has you covered.
            </p>
            <div className="mt-8 space-y-4 text-sm">
              <div className="flex items-center gap-3 text-slate-700">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-light text-navy">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
                  </svg>
                </span>
                <span>+254 115 760 594</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-light text-navy">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </span>
                <span>teravaproperties@gmail.com</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-light text-navy">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </span>
                <span>Matuu, Kenya</span>
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] bg-navy-light p-8">
            <ContactForm />
          </div>
        </div>
      </section>

      <footer className="bg-navy-darker py-14 text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 sm:px-10 lg:flex-row lg:items-start lg:justify-between lg:px-12">
          <div className="flex items-center gap-3">
            <LogoMark className="h-12 w-12 shrink-0" light />
            <Wordmark light />
          </div>
          <div className="flex flex-col gap-3 text-sm text-white/70 sm:flex-row sm:gap-12">
            <div className="flex flex-col gap-2">
              <span className="font-bold text-white">Company</span>
              <a href="#services" className="transition hover:text-white">Services</a>
              <a href="#properties" className="transition hover:text-white">Properties</a>
              <a href="#why" className="transition hover:text-white">Why Terava</a>
              <Link href="/admin" className="transition hover:text-white">Admin</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-bold text-white">Contact</span>
              <a href="tel:+254115760594" className="transition hover:text-white">+254 115 760 594</a>
              <a href="mailto:teravaproperties@gmail.com" className="transition hover:text-white">
                teravaproperties@gmail.com
              </a>
              <span>Matuu, Kenya</span>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 w-full max-w-7xl border-t border-white/10 px-6 pt-6 sm:px-10 lg:px-12">
          <p className="text-xs text-white/50">
            &copy; {new Date().getFullYear()} Terava Property Management &amp; Cleaning Services. We Manage. You Earn.
          </p>
        </div>
      </footer>
    </main>
  );
}
