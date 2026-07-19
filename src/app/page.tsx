import Link from "next/link";

const phases = [
  {
    title: "Property onboarding",
    description:
      "Register existing buildings first, then define floors, blocks, or no-floor compounds without forcing a rigid layout.",
  },
  {
    title: "Unit configuration",
    description:
      "Create property-specific unit types like bedsitter, 1 bedroom, shop, or single room, each with default rent and deposit.",
  },
  {
    title: "Lease and payments",
    description:
      "Attach tenants to units through leases so you keep move-in history, arrears, and payment records clean over time.",
  },
  {
    title: "Automation",
    description:
      "Add M-Pesa reconciliation, reminders, maintenance, documents, and reports once the core operations are stable.",
  },
];

const structure = [
  "Property is the top-level record for a real-world building or compound.",
  "Floor is optional and free-form, so ground, first, or no-floor compounds all work.",
  "Unit type is defined per property, not globally, because naming and pricing differ from one landlord to another.",
  "Unit keeps the actual unit name used on the ground, such as A1, House 12, or G-02.",
  "Lease links tenant to unit and preserves history when occupants change.",
];

const sampleMetrics = [
  { label: "Units occupied", value: "42" },
  { label: "Current arrears", value: "KES 128,400" },
  { label: "Properties onboarded", value: "6" },
  { label: "Pending repairs", value: "9" },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-14 px-6 py-8 sm:px-10 lg:px-12">
      <section className="overflow-hidden rounded-[2rem] border border-amber-950/10 bg-white/80 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.3fr_0.9fr] lg:px-10 lg:py-10">
          <div className="flex flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-900/10 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900">
              Kenya rental operations, designed for mixed building layouts
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                A property system that handles real flats, real unit names, and real lease history.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                This build starts from the actual operational model: property onboarding first, then flexible floors, property-defined unit types, freeform unit names, and leases that keep the payment history intact.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" href="#structure">
                See the model
              </a>
              <Link className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400" href="/admin">
                Open admin shell
              </Link>
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-950 p-5 text-white">
            <div className="grid grid-cols-2 gap-3">
              {sampleMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-white/55">{metric.label}</div>
                  <div className="mt-2 text-2xl font-semibold">{metric.value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 p-4">
              <p className="text-sm leading-6 text-white/85">
                The important part is the onboarding sequence: properties are created first, then floors or compound labels, then unit types, then individual units with the names people already use on-site.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {phases.map((phase, index) => (
          <article key={phase.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-amber-700">0{index + 1}</div>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">{phase.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{phase.description}</p>
          </article>
        ))}
      </section>

      <section id="structure" className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">Modeling approach</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            This avoids hard-coding floor counts or standard apartment numbering. It lets each property be configured as it exists on the ground, which is what you need in Kenyan rental stock.
          </p>
          <div className="mt-6 space-y-4">
            {structure.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-white/60">Admin shell</div>
              <h2 className="mt-2 text-2xl font-semibold">The system surfaces</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/60">
              next step
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              "Properties and floors",
              "Unit types and naming",
              "Tenant onboarding and leases",
              "Payments, arrears, reminders",
              "Maintenance requests",
              "Reports and exports",
              "Public inquiry listings",
              "Documents and media",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
