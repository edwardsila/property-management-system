"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PropertyType =
  | "APARTMENT_BLOCK"
  | "FLAT"
  | "BUNGALOW"
  | "SHOPPING_COMPLEX"
  | "MIXED_USE"
  | "OTHER";

type UnitStatus = "VACANT" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
type LeaseStatus = "DRAFT" | "ACTIVE" | "ENDED" | "TERMINATED";
type PaymentMethod = "CASH" | "BANK" | "MPESA" | "OTHER";
type PaymentStatus = "PENDING" | "CONFIRMED" | "REVERSED";

type Property = {
  id: string;
  ownerId: string;
  managerId: string | null;
  name: string;
  slug: string;
  type: PropertyType;
  location: string;
  description: string | null;
  notes: string | null;
};

type Floor = {
  id: string;
  propertyId: string;
  label: string;
  sortOrder: number;
  notes: string | null;
};

type UnitType = {
  id: string;
  propertyId: string;
  name: string;
  description: string | null;
  defaultRent: string | null;
  defaultDeposit: string | null;
  sortOrder: number;
};

type Unit = {
  id: string;
  propertyId: string;
  floorId: string | null;
  unitTypeId: string | null;
  unitName: string;
  unitCode: string | null;
  status: UnitStatus;
  rentAmount: string | null;
  depositAmount: string | null;
  notes: string | null;
};

type Tenant = {
  id: string;
  propertyId: string;
  createdById: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  nationalId: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  notes: string | null;
};

type Lease = {
  id: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  status: LeaseStatus;
  startDate: string;
  endDate: string | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  monthlyRent: string;
  depositAmount: string | null;
  graceDays: number;
  notes: string | null;
};

type Payment = {
  id: string;
  propertyId: string;
  leaseId: string;
  tenantId: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  receivedAt: string;
  notes: string | null;
};

type BootstrapPayload = {
  properties: Property[];
  floors: Floor[];
  unitTypes: UnitType[];
  units: Unit[];
  tenants: Tenant[];
  leases: Lease[];
  payments: Payment[];
};

const propertyTypes: Array<{ label: string; value: PropertyType }> = [
  { label: "Apartment block", value: "APARTMENT_BLOCK" },
  { label: "Flat", value: "FLAT" },
  { label: "Bungalow", value: "BUNGALOW" },
  { label: "Shopping complex", value: "SHOPPING_COMPLEX" },
  { label: "Mixed use", value: "MIXED_USE" },
  { label: "Other", value: "OTHER" },
];

const unitStatuses: Array<{ label: string; value: UnitStatus }> = [
  { label: "Vacant", value: "VACANT" },
  { label: "Occupied", value: "OCCUPIED" },
  { label: "Reserved", value: "RESERVED" },
  { label: "Maintenance", value: "MAINTENANCE" },
];

const leaseStatuses: Array<{ label: string; value: LeaseStatus }> = [
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
  { label: "Ended", value: "ENDED" },
  { label: "Terminated", value: "TERMINATED" },
];

const paymentMethods: Array<{ label: string; value: PaymentMethod }> = [
  { label: "Cash", value: "CASH" },
  { label: "Bank", value: "BANK" },
  { label: "M-Pesa", value: "MPESA" },
  { label: "Other", value: "OTHER" },
];

const paymentStatuses: Array<{ label: string; value: PaymentStatus }> = [
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Reversed", value: "REVERSED" },
];

function money(value: string | null | undefined) {
  const parsed = Number(value || 0);

  if (Number.isNaN(parsed)) {
    return "KES 0";
  }

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(parsed);
}

function dateInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function emptyProperty(): Property {
  return {
    id: "",
    ownerId: "",
    managerId: null,
    name: "",
    slug: "",
    type: "APARTMENT_BLOCK",
    location: "",
    description: null,
    notes: null,
  };
}

function emptyFloor(propertyId = ""): Floor {
  return {
    id: "",
    propertyId,
    label: "",
    sortOrder: 0,
    notes: null,
  };
}

function emptyUnitType(propertyId = ""): UnitType {
  return {
    id: "",
    propertyId,
    name: "",
    description: null,
    defaultRent: null,
    defaultDeposit: null,
    sortOrder: 0,
  };
}

function emptyUnit(propertyId = ""): Unit {
  return {
    id: "",
    propertyId,
    floorId: null,
    unitTypeId: null,
    unitName: "",
    unitCode: null,
    status: "VACANT",
    rentAmount: null,
    depositAmount: null,
    notes: null,
  };
}

function emptyTenant(propertyId = ""): Tenant {
  return {
    id: "",
    propertyId,
    createdById: null,
    fullName: "",
    phone: "",
    email: null,
    nationalId: null,
    nextOfKinName: null,
    nextOfKinPhone: null,
    notes: null,
  };
}

function emptyLease(propertyId = ""): Lease {
  return {
    id: "",
    propertyId,
    unitId: "",
    tenantId: "",
    status: "DRAFT",
    startDate: new Date().toISOString(),
    endDate: null,
    moveInDate: null,
    moveOutDate: null,
    monthlyRent: "",
    depositAmount: null,
    graceDays: 0,
    notes: null,
  };
}

function emptyPayment(propertyId = ""): Payment {
  return {
    id: "",
    propertyId,
    leaseId: "",
    tenantId: "",
    amount: "",
    method: "CASH",
    status: "CONFIRMED",
    reference: null,
    receivedAt: new Date().toISOString(),
    notes: null,
  };
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;

  if (!response.ok) {
    throw new Error(payload && typeof payload === "object" && "error" in payload && payload.error ? payload.error : "Request failed");
  }

  return payload as T;
}

export default function AdminPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  const [propertyForm, setPropertyForm] = useState<Property>(emptyProperty());
  const [floorForm, setFloorForm] = useState<Floor>(emptyFloor());
  const [unitTypeForm, setUnitTypeForm] = useState<UnitType>(emptyUnitType());
  const [unitForm, setUnitForm] = useState<Unit>(emptyUnit());
  const [tenantForm, setTenantForm] = useState<Tenant>(emptyTenant());
  const [leaseForm, setLeaseForm] = useState<Lease>(emptyLease());
  const [paymentForm, setPaymentForm] = useState<Payment>(emptyPayment());

  const [editingPropertyId, setEditingPropertyId] = useState("");
  const [editingFloorId, setEditingFloorId] = useState("");
  const [editingUnitTypeId, setEditingUnitTypeId] = useState("");
  const [editingUnitId, setEditingUnitId] = useState("");
  const [editingTenantId, setEditingTenantId] = useState("");
  const [editingLeaseId, setEditingLeaseId] = useState("");
  const [editingPaymentId, setEditingPaymentId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"properties" | "units" | "tenants" | "leases" | "payments">("properties");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const data = await requestJson<BootstrapPayload>("/api/bootstrap");

        if (!active) {
          return;
        }

        setProperties(data.properties);
        setFloors(data.floors);
        setUnitTypes(data.unitTypes);
        setUnits(data.units);
        setTenants(data.tenants);
        setLeases(data.leases);
        setPayments(data.payments);
        setSelectedPropertyId(data.properties[0]?.id ?? "");
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load workspace");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const selectedProperty = useMemo(() => properties.find((property) => property.id === selectedPropertyId) ?? null, [properties, selectedPropertyId]);
  const propertyFloors = useMemo(() => floors.filter((floor) => floor.propertyId === selectedPropertyId), [floors, selectedPropertyId]);
  const propertyUnitTypes = useMemo(() => unitTypes.filter((unitType) => unitType.propertyId === selectedPropertyId), [selectedPropertyId, unitTypes]);
  const propertyUnits = useMemo(() => units.filter((unit) => unit.propertyId === selectedPropertyId), [selectedPropertyId, units]);
  const propertyTenants = useMemo(() => tenants.filter((tenant) => tenant.propertyId === selectedPropertyId), [selectedPropertyId, tenants]);
  const propertyLeases = useMemo(() => leases.filter((lease) => lease.propertyId === selectedPropertyId), [leases, selectedPropertyId]);
  const propertyPayments = useMemo(() => payments.filter((payment) => payment.propertyId === selectedPropertyId), [payments, selectedPropertyId]);
  const activeLeasesCount = useMemo(() => leases.filter((lease) => lease.status === "ACTIVE").length, [leases]);
  const confirmedPaymentsTotal = useMemo(
    () => payments.reduce((total, payment) => total + (payment.status === "CONFIRMED" ? Number(payment.amount || 0) : 0), 0),
    [payments],
  );
  const confirmedMpesaPayments = useMemo(
    () => payments.filter((payment) => payment.method === "MPESA" && payment.status === "CONFIRMED").length,
    [payments],
  );
  const pendingMpesaPayments = useMemo(
    () => payments.filter((payment) => payment.method === "MPESA" && payment.status === "PENDING").length,
    [payments],
  );

  const dashboardMetrics = useMemo(
    () => [
      { label: "Properties", value: String(properties.length), note: `${floors.length} floors · ${units.length} units` },
      { label: "Tenants", value: String(tenants.length), note: `${activeLeasesCount} active leases` },
      { label: "Amount received", value: money(String(confirmedPaymentsTotal)), note: `${confirmedMpesaPayments} confirmed M-Pesa` },
      { label: "Payments", value: String(payments.length), note: `${pendingMpesaPayments} M-Pesa pending` },
    ],
    [activeLeasesCount, confirmedMpesaPayments, confirmedPaymentsTotal, floors.length, payments.length, pendingMpesaPayments, properties.length, tenants.length, units.length],
  );

  async function refresh() {
    const data = await requestJson<BootstrapPayload>("/api/bootstrap");
    setProperties(data.properties);
    setFloors(data.floors);
    setUnitTypes(data.unitTypes);
    setUnits(data.units);
    setTenants(data.tenants);
    setLeases(data.leases);
    setPayments(data.payments);
    setSelectedPropertyId((current) => current || data.properties[0]?.id || "");
  }

  async function submitJson(path: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
    await requestJson(path, {
      method,
      body: JSON.stringify(body),
    });
  }

  async function handlePropertySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!propertyForm.name.trim() || !propertyForm.location.trim()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...propertyForm,
        slug: propertyForm.slug || slugify(propertyForm.name),
      };

      if (editingPropertyId) {
        await submitJson(`/api/properties/${editingPropertyId}`, "PATCH", payload);
      } else {
        await submitJson("/api/properties", "POST", payload);
      }

      await refresh();
      setEditingPropertyId("");
      setPropertyForm(emptyProperty());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save property");
    } finally {
      setSaving(false);
    }
  }

  async function handleFloorSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!floorForm.propertyId || !floorForm.label.trim()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingFloorId) {
        await submitJson(`/api/floors/${editingFloorId}`, "PATCH", floorForm);
      } else {
        await submitJson(`/api/properties/${floorForm.propertyId}/floors`, "POST", floorForm);
      }

      await refresh();
      setEditingFloorId("");
      setFloorForm(emptyFloor(selectedPropertyId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save floor");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnitTypeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!unitTypeForm.propertyId || !unitTypeForm.name.trim()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingUnitTypeId) {
        await submitJson(`/api/unit-types/${editingUnitTypeId}`, "PATCH", unitTypeForm);
      } else {
        await submitJson(`/api/properties/${unitTypeForm.propertyId}/unit-types`, "POST", unitTypeForm);
      }

      await refresh();
      setEditingUnitTypeId("");
      setUnitTypeForm(emptyUnitType(selectedPropertyId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save unit type");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnitSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!unitForm.propertyId || !unitForm.unitName.trim()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingUnitId) {
        await submitJson(`/api/units/${editingUnitId}`, "PATCH", unitForm);
      } else {
        await submitJson(`/api/properties/${unitForm.propertyId}/units`, "POST", unitForm);
      }

      await refresh();
      setEditingUnitId("");
      setUnitForm(emptyUnit(selectedPropertyId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save unit");
    } finally {
      setSaving(false);
    }
  }

  async function handleTenantSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantForm.propertyId || !tenantForm.fullName.trim() || !tenantForm.phone.trim()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingTenantId) {
        await submitJson(`/api/tenants/${editingTenantId}`, "PATCH", tenantForm);
      } else {
        await submitJson(`/api/properties/${tenantForm.propertyId}/tenants`, "POST", tenantForm);
      }

      await refresh();
      setEditingTenantId("");
      setTenantForm(emptyTenant(selectedPropertyId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save tenant");
    } finally {
      setSaving(false);
    }
  }

  async function handleLeaseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!leaseForm.propertyId || !leaseForm.unitId || !leaseForm.tenantId || !leaseForm.monthlyRent.trim() || !leaseForm.startDate) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingLeaseId) {
        await submitJson(`/api/leases/${editingLeaseId}`, "PATCH", leaseForm);
      } else {
        await submitJson(`/api/properties/${leaseForm.propertyId}/leases`, "POST", leaseForm);
      }

      await refresh();
      setEditingLeaseId("");
      setLeaseForm(emptyLease(selectedPropertyId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save lease");
    } finally {
      setSaving(false);
    }
  }

  async function handlePaymentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!paymentForm.propertyId || !paymentForm.leaseId || !paymentForm.tenantId || !paymentForm.amount.trim()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingPaymentId) {
        await submitJson(`/api/payments/${editingPaymentId}`, "PATCH", paymentForm);
      } else {
        await submitJson(`/api/properties/${paymentForm.propertyId}/payments`, "POST", paymentForm);
      }

      await refresh();
      setEditingPaymentId("");
      setPaymentForm(emptyPayment(selectedPropertyId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save payment");
    } finally {
      setSaving(false);
    }
  }

  async function deleteResource(path: string) {
    setSaving(true);
    setError(null);

    try {
      await requestJson(path, { method: "DELETE" });
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete item");
    } finally {
      setSaving(false);
    }
  }

  const propertySummary = [
    { label: "Properties", value: properties.length },
    { label: "Floors / sections", value: floors.length },
    { label: "Unit types", value: unitTypes.length },
    { label: "Units", value: units.length },
    { label: "Tenants", value: tenants.length },
    { label: "Leases", value: leases.length },
    { label: "Payments", value: payments.length },
  ];

  return (
    <main className="min-h-[calc(100vh-2rem)] w-full px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid min-h-[calc(100vh-2rem)] gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-4 flex h-fit flex-col gap-6 rounded-[1.5rem] border border-slate-800 bg-slate-900/95 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur">
          <div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300">
              Terava Properties.
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-50">Property Command Center</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Property workspace.
            </p>
          </div>

          <nav className="space-y-2">
            {[
              { id: "properties", label: "Properties" },
              { id: "units", label: "Units" },
              { id: "tenants", label: "Tenants" },
              { id: "leases", label: "Leases" },
              { id: "payments", label: "Payments" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id as typeof activeSection)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                  activeSection === item.id
                    ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                    : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.id}</span>
              </button>
            ))}
          </nav>

          <div className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-950 p-4 text-white">
            {propertySummary.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">{item.label}</div>
                <div className="mt-2 text-lg font-semibold">{loading ? "..." : item.value}</div>
              </div>
            ))}
          </div>

          <Link className="rounded-full border border-slate-700 bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-800" href="/">
            Back to overview
          </Link>
        </aside>

        <section className="flex flex-col gap-6">
          <header className="rounded-[1.5rem] border border-slate-800 bg-slate-900/95 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur lg:p-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-3">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300">
                  Database-backed setup workspace
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
                  {selectedProperty?.name ?? "Select a property to work on"}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-400">
                  Use the property rail on the left to switch context, then manage the nested records in sections below.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <div className="rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-slate-300">
                  {selectedProperty?.location ?? "No property selected"}
                </div>
                <div className="rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-slate-300">
                  {selectedProperty?.type.replace(/_/g, " ") ?? "-"}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardMetrics.map((metric) => (
                <div key={metric.label} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{metric.label}</div>
                  <div className="mt-3 text-2xl font-semibold text-slate-50">{metric.value}</div>
                  <div className="mt-2 text-sm text-slate-400">{metric.note}</div>
                </div>
              ))}
            </div>

            {error ? <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
          </header>

          {activeSection === "properties" ? (
            <SectionCard title="Properties" description="Create the top-level building or compound record first.">
              <PropertyManager
                loading={loading}
                saving={saving}
                properties={properties}
                selectedPropertyId={selectedPropertyId}
                propertyForm={propertyForm}
                setPropertyForm={setPropertyForm}
                setEditingPropertyId={setEditingPropertyId}
                editingPropertyId={editingPropertyId}
                handlePropertySubmit={handlePropertySubmit}
                deleteResource={deleteResource}
                setSelectedPropertyId={setSelectedPropertyId}
                setFloorForm={setFloorForm}
                setUnitTypeForm={setUnitTypeForm}
                setUnitForm={setUnitForm}
              />
            </SectionCard>
          ) : null}

          {activeSection === "units" ? (
            <div className="grid gap-6 xl:grid-cols-3">
              <SectionCard title="Floors and sections" description="Optional labels for stairs, floors, blocks, or compound sections.">
                <FloorManager
                  loading={loading}
                  saving={saving}
                  properties={properties}
                  selectedPropertyId={selectedPropertyId}
                  floorForm={floorForm}
                  setFloorForm={setFloorForm}
                  editingFloorId={editingFloorId}
                  setEditingFloorId={setEditingFloorId}
                  handleFloorSubmit={handleFloorSubmit}
                  floors={propertyFloors}
                  deleteResource={deleteResource}
                  setSelectedPropertyId={setSelectedPropertyId}
                  setUnitForm={setUnitForm}
                  setUnitTypeForm={setUnitTypeForm}
                />
              </SectionCard>

              <SectionCard title="Unit types" description="Property-specific categories like bedsitter, 1 bedroom, or shop.">
                <UnitTypeManager
                  loading={loading}
                  saving={saving}
                  properties={properties}
                  selectedPropertyId={selectedPropertyId}
                  unitTypeForm={unitTypeForm}
                  setUnitTypeForm={setUnitTypeForm}
                  editingUnitTypeId={editingUnitTypeId}
                  setEditingUnitTypeId={setEditingUnitTypeId}
                  handleUnitTypeSubmit={handleUnitTypeSubmit}
                  unitTypes={propertyUnitTypes}
                  deleteResource={deleteResource}
                  setSelectedPropertyId={setSelectedPropertyId}
                  setFloorForm={setFloorForm}
                  setUnitForm={setUnitForm}
                />
              </SectionCard>

              <SectionCard title="Units" description="Enter the actual unit names used onsite and tie them to floor and type.">
                <UnitManager
                  loading={loading}
                  saving={saving}
                  properties={properties}
                  selectedPropertyId={selectedPropertyId}
                  unitForm={unitForm}
                  setUnitForm={setUnitForm}
                  editingUnitId={editingUnitId}
                  setEditingUnitId={setEditingUnitId}
                  handleUnitSubmit={handleUnitSubmit}
                  units={propertyUnits}
                  floors={floors}
                  unitTypes={unitTypes}
                  deleteResource={deleteResource}
                  setSelectedPropertyId={setSelectedPropertyId}
                  setFloorForm={setFloorForm}
                  setUnitTypeForm={setUnitTypeForm}
                />
              </SectionCard>
            </div>
          ) : null}

          {activeSection === "tenants" ? (
            <SectionCard title="Tenants" description="Add occupants before you create leases.">
              <TenantManager
                loading={loading}
                saving={saving}
                properties={properties}
                selectedPropertyId={selectedPropertyId}
                tenantForm={tenantForm}
                setTenantForm={setTenantForm}
                editingTenantId={editingTenantId}
                setEditingTenantId={setEditingTenantId}
                handleTenantSubmit={handleTenantSubmit}
                tenants={propertyTenants}
                deleteResource={deleteResource}
                setSelectedPropertyId={setSelectedPropertyId}
              />
            </SectionCard>
          ) : null}

          {activeSection === "leases" ? (
            <SectionCard title="Leases" description="Connect a tenant to a unit and keep the history.">
              <LeaseManager
                loading={loading}
                saving={saving}
                properties={properties}
                selectedPropertyId={selectedPropertyId}
                leaseForm={leaseForm}
                setLeaseForm={setLeaseForm}
                editingLeaseId={editingLeaseId}
                setEditingLeaseId={setEditingLeaseId}
                handleLeaseSubmit={handleLeaseSubmit}
                leases={propertyLeases}
                tenants={tenants.filter((tenant) => tenant.propertyId === selectedPropertyId)}
                units={units.filter((unit) => unit.propertyId === selectedPropertyId)}
                deleteResource={deleteResource}
                setSelectedPropertyId={setSelectedPropertyId}
              />
            </SectionCard>
          ) : null}

          {activeSection === "payments" ? (
            <SectionCard title="Payments" description="Record cash, bank, or M-Pesa payments against a lease. Daraja callbacks can be matched to tenant leases by receipt code or phone.">
              <PaymentManager
                loading={loading}
                saving={saving}
                properties={properties}
                selectedPropertyId={selectedPropertyId}
                paymentForm={paymentForm}
                setPaymentForm={setPaymentForm}
                editingPaymentId={editingPaymentId}
                setEditingPaymentId={setEditingPaymentId}
                handlePaymentSubmit={handlePaymentSubmit}
                payments={propertyPayments}
                leases={leases.filter((lease) => lease.propertyId === selectedPropertyId)}
                tenants={tenants.filter((tenant) => tenant.propertyId === selectedPropertyId)}
                deleteResource={deleteResource}
                setSelectedPropertyId={setSelectedPropertyId}
              />
            </SectionCard>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[1.5rem] border border-slate-800 bg-slate-900 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)] lg:p-8">
      <div className="space-y-2">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">Workspace</div>
        <h3 className="text-2xl font-semibold text-slate-50">{title}</h3>
        <p className="text-sm leading-7 text-slate-400">{description}</p>
      </div>
      <div className="mt-6">{children}</div>
    </article>
  );
}

function PropertyManager({
  loading,
  saving,
  properties,
  selectedPropertyId,
  propertyForm,
  setPropertyForm,
  setEditingPropertyId,
  editingPropertyId,
  handlePropertySubmit,
  deleteResource,
  setSelectedPropertyId,
  setFloorForm,
  setUnitTypeForm,
  setUnitForm,
}: {
  loading: boolean;
  saving: boolean;
  properties: Property[];
  selectedPropertyId: string;
  propertyForm: Property;
  setPropertyForm: React.Dispatch<React.SetStateAction<Property>>;
  setEditingPropertyId: (value: string) => void;
  editingPropertyId: string;
  handlePropertySubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  deleteResource: (path: string) => Promise<void>;
  setSelectedPropertyId: (value: string) => void;
  setFloorForm: React.Dispatch<React.SetStateAction<Floor>>;
  setUnitTypeForm: React.Dispatch<React.SetStateAction<UnitType>>;
  setUnitForm: React.Dispatch<React.SetStateAction<Unit>>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
      <form className="grid gap-4" onSubmit={handlePropertySubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Property name">
            <input className={inputClass} value={propertyForm.name} onChange={(event) => setPropertyForm((current) => ({ ...current, name: event.target.value }))} placeholder="Mabati Court" />
          </Field>
          <Field label="Slug">
            <input className={inputClass} value={propertyForm.slug} onChange={(event) => setPropertyForm((current) => ({ ...current, slug: event.target.value }))} placeholder="mabati-court" />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Property type">
            <select className={inputClass} value={propertyForm.type} onChange={(event) => setPropertyForm((current) => ({ ...current, type: event.target.value as PropertyType }))}>
              {propertyTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Location">
            <input className={inputClass} value={propertyForm.location} onChange={(event) => setPropertyForm((current) => ({ ...current, location: event.target.value }))} placeholder="Kasarani, Nairobi" />
          </Field>
        </div>

        <Field label="Description">
          <textarea className={`${inputClass} min-h-24`} value={propertyForm.description ?? ""} onChange={(event) => setPropertyForm((current) => ({ ...current, description: event.target.value }))} />
        </Field>

        <Field label="Notes">
          <textarea className={`${inputClass} min-h-24`} value={propertyForm.notes ?? ""} onChange={(event) => setPropertyForm((current) => ({ ...current, notes: event.target.value }))} />
        </Field>

        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClass} type="submit" disabled={saving || loading}>{saving ? "Saving..." : editingPropertyId ? "Save property" : "Create property"}</button>
          <button className={secondaryButtonClass} type="button" onClick={() => { setPropertyForm(emptyProperty()); setEditingPropertyId(""); }}>Clear</button>
        </div>
      </form>

      <div className="grid gap-4">
        {properties.length === 0 ? <EmptyState text="No properties yet. Create the first one on the left." /> : null}
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            selected={selectedPropertyId === property.id}
            onSelect={() => {
              setSelectedPropertyId(property.id);
              setFloorForm(emptyFloor(property.id));
              setUnitTypeForm(emptyUnitType(property.id));
              setUnitForm(emptyUnit(property.id));
            }}
            onEdit={() => setPropertyForm(property)}
            onDelete={() => deleteResource(`/api/properties/${property.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function PropertyCard({ property, selected, onSelect, onEdit, onDelete }: { property: Property; selected: boolean; onSelect: () => void; onEdit: () => void; onDelete: () => void; }) {
  return (
    <div className={`rounded-3xl border p-5 transition ${selected ? "border-amber-400/40 bg-amber-500/10" : "border-slate-800 bg-slate-950/70"}`}>
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-50">{property.name}</div>
            <div className="mt-1 text-sm text-slate-400">{property.location}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{property.slug}</div>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100">{property.type.replace(/_/g, " ")}</span>
        </div>
      </button>
      <div className="mt-4 flex flex-wrap gap-2">
        <TableButton onClick={onEdit}>Edit</TableButton>
        <TableDangerButton onClick={onDelete}>Delete</TableDangerButton>
      </div>
    </div>
  );
}

function FloorManager({
  loading,
  saving,
  properties,
  selectedPropertyId,
  floorForm,
  setFloorForm,
  editingFloorId,
  setEditingFloorId,
  handleFloorSubmit,
  floors,
  deleteResource,
  setSelectedPropertyId,
  setUnitForm,
  setUnitTypeForm,
}: {
  loading: boolean;
  saving: boolean;
  properties: Property[];
  selectedPropertyId: string;
  floorForm: Floor;
  setFloorForm: React.Dispatch<React.SetStateAction<Floor>>;
  editingFloorId: string;
  setEditingFloorId: (value: string) => void;
  handleFloorSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  floors: Floor[];
  deleteResource: (path: string) => Promise<void>;
  setSelectedPropertyId: (value: string) => void;
  setUnitForm: React.Dispatch<React.SetStateAction<Unit>>;
  setUnitTypeForm: React.Dispatch<React.SetStateAction<UnitType>>;
}) {
  return (
    <div className="grid gap-4">
      <form className="grid gap-4" onSubmit={handleFloorSubmit}>
        <Field label="Property">
          <select className={inputClass} value={floorForm.propertyId} onChange={(event) => { const value = event.target.value; setFloorForm((current) => ({ ...current, propertyId: value })); setSelectedPropertyId(value); setUnitForm((current) => ({ ...current, propertyId: value })); setUnitTypeForm((current) => ({ ...current, propertyId: value })); }}>
            <option value="">Select property</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
          </select>
        </Field>
        <Field label="Label"><input className={inputClass} value={floorForm.label} onChange={(event) => setFloorForm((current) => ({ ...current, label: event.target.value }))} placeholder="Ground, 1st Floor, Upper block" /></Field>
        <Field label="Sort order"><input className={inputClass} type="number" value={floorForm.sortOrder} onChange={(event) => setFloorForm((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))} /></Field>
        <Field label="Notes"><textarea className={`${inputClass} min-h-24`} value={floorForm.notes ?? ""} onChange={(event) => setFloorForm((current) => ({ ...current, notes: event.target.value }))} /></Field>
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClass} type="submit" disabled={saving || loading}>{saving ? "Saving..." : editingFloorId ? "Save floor" : "Create floor"}</button>
          <button className={secondaryButtonClass} type="button" onClick={() => { setFloorForm(emptyFloor(selectedPropertyId)); setEditingFloorId(""); }}>Clear</button>
        </div>
      </form>
      <div className="space-y-3">{floors.length === 0 ? <EmptyState text="No floors yet for this property." /> : null}{floors.map((floor) => <ListRow key={floor.id} title={floor.label} subtitle={`Order ${floor.sortOrder}`} meta={floor.notes || "No notes"} onEdit={() => { setEditingFloorId(floor.id); setFloorForm(floor); setSelectedPropertyId(floor.propertyId); }} onDelete={() => deleteResource(`/api/floors/${floor.id}`)} />)}</div>
    </div>
  );
}

function UnitTypeManager({
  loading,
  saving,
  properties,
  selectedPropertyId,
  unitTypeForm,
  setUnitTypeForm,
  editingUnitTypeId,
  setEditingUnitTypeId,
  handleUnitTypeSubmit,
  unitTypes,
  deleteResource,
  setSelectedPropertyId,
  setFloorForm,
  setUnitForm,
}: {
  loading: boolean;
  saving: boolean;
  properties: Property[];
  selectedPropertyId: string;
  unitTypeForm: UnitType;
  setUnitTypeForm: React.Dispatch<React.SetStateAction<UnitType>>;
  editingUnitTypeId: string;
  setEditingUnitTypeId: (value: string) => void;
  handleUnitTypeSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  unitTypes: UnitType[];
  deleteResource: (path: string) => Promise<void>;
  setSelectedPropertyId: (value: string) => void;
  setFloorForm: React.Dispatch<React.SetStateAction<Floor>>;
  setUnitForm: React.Dispatch<React.SetStateAction<Unit>>;
}) {
  return (
    <div className="grid gap-4">
      <form className="grid gap-4" onSubmit={handleUnitTypeSubmit}>
        <Field label="Property">
          <select className={inputClass} value={unitTypeForm.propertyId} onChange={(event) => { const value = event.target.value; setUnitTypeForm((current) => ({ ...current, propertyId: value })); setSelectedPropertyId(value); setFloorForm((current) => ({ ...current, propertyId: value })); setUnitForm((current) => ({ ...current, propertyId: value })); }}>
            <option value="">Select property</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
          </select>
        </Field>
        <Field label="Type name"><input className={inputClass} value={unitTypeForm.name} onChange={(event) => setUnitTypeForm((current) => ({ ...current, name: event.target.value }))} placeholder="Bedsitter, 1 Bedroom, Shop" /></Field>
        <Field label="Description"><textarea className={`${inputClass} min-h-24`} value={unitTypeForm.description ?? ""} onChange={(event) => setUnitTypeForm((current) => ({ ...current, description: event.target.value }))} /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Default rent"><input className={inputClass} type="number" value={unitTypeForm.defaultRent ?? ""} onChange={(event) => setUnitTypeForm((current) => ({ ...current, defaultRent: event.target.value }))} /></Field>
          <Field label="Default deposit"><input className={inputClass} type="number" value={unitTypeForm.defaultDeposit ?? ""} onChange={(event) => setUnitTypeForm((current) => ({ ...current, defaultDeposit: event.target.value }))} /></Field>
        </div>
        <Field label="Sort order"><input className={inputClass} type="number" value={unitTypeForm.sortOrder} onChange={(event) => setUnitTypeForm((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))} /></Field>
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClass} type="submit" disabled={saving || loading}>{saving ? "Saving..." : editingUnitTypeId ? "Save type" : "Create type"}</button>
          <button className={secondaryButtonClass} type="button" onClick={() => { setUnitTypeForm(emptyUnitType(selectedPropertyId)); setEditingUnitTypeId(""); }}>Clear</button>
        </div>
      </form>
      <div className="space-y-3">{unitTypes.length === 0 ? <EmptyState text="No unit types yet for this property." /> : null}{unitTypes.map((unitType) => <ListRow key={unitType.id} title={unitType.name} subtitle={`${money(unitType.defaultRent)} default rent`} meta={unitType.description || "No description"} onEdit={() => { setEditingUnitTypeId(unitType.id); setUnitTypeForm(unitType); setSelectedPropertyId(unitType.propertyId); }} onDelete={() => deleteResource(`/api/unit-types/${unitType.id}`)} />)}</div>
    </div>
  );
}

function UnitManager({
  loading,
  saving,
  properties,
  selectedPropertyId,
  unitForm,
  setUnitForm,
  editingUnitId,
  setEditingUnitId,
  handleUnitSubmit,
  units,
  floors,
  unitTypes,
  deleteResource,
  setSelectedPropertyId,
  setFloorForm,
  setUnitTypeForm,
}: {
  loading: boolean;
  saving: boolean;
  properties: Property[];
  selectedPropertyId: string;
  unitForm: Unit;
  setUnitForm: React.Dispatch<React.SetStateAction<Unit>>;
  editingUnitId: string;
  setEditingUnitId: (value: string) => void;
  handleUnitSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  units: Unit[];
  floors: Floor[];
  unitTypes: UnitType[];
  deleteResource: (path: string) => Promise<void>;
  setSelectedPropertyId: (value: string) => void;
  setFloorForm: React.Dispatch<React.SetStateAction<Floor>>;
  setUnitTypeForm: React.Dispatch<React.SetStateAction<UnitType>>;
}) {
  return (
    <div className="grid gap-4">
      <form className="grid gap-4" onSubmit={handleUnitSubmit}>
        <Field label="Property">
          <select className={inputClass} value={unitForm.propertyId} onChange={(event) => { const value = event.target.value; setUnitForm((current) => ({ ...current, propertyId: value, floorId: null, unitTypeId: null })); setSelectedPropertyId(value); setFloorForm((current) => ({ ...current, propertyId: value })); setUnitTypeForm((current) => ({ ...current, propertyId: value })); }}>
            <option value="">Select property</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
          </select>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Unit name"><input className={inputClass} value={unitForm.unitName} onChange={(event) => setUnitForm((current) => ({ ...current, unitName: event.target.value }))} placeholder="A1, G-02, House 12" /></Field>
          <Field label="Unit code"><input className={inputClass} value={unitForm.unitCode ?? ""} onChange={(event) => setUnitForm((current) => ({ ...current, unitCode: event.target.value }))} placeholder="Optional code" /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Floor / section">
            <select className={inputClass} value={unitForm.floorId ?? ""} onChange={(event) => setUnitForm((current) => ({ ...current, floorId: event.target.value || null }))}>
              <option value="">Not assigned</option>
              {floors.filter((floor) => floor.propertyId === unitForm.propertyId).map((floor) => <option key={floor.id} value={floor.id}>{floor.label}</option>)}
            </select>
          </Field>
          <Field label="Unit type">
            <select className={inputClass} value={unitForm.unitTypeId ?? ""} onChange={(event) => setUnitForm((current) => ({ ...current, unitTypeId: event.target.value || null }))}>
              <option value="">Not assigned</option>
              {unitTypes.filter((unitType) => unitType.propertyId === unitForm.propertyId).map((unitType) => <option key={unitType.id} value={unitType.id}>{unitType.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Status"><select className={inputClass} value={unitForm.status} onChange={(event) => setUnitForm((current) => ({ ...current, status: event.target.value as UnitStatus }))}>{unitStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></Field>
          <Field label="Rent amount"><input className={inputClass} type="number" value={unitForm.rentAmount ?? ""} onChange={(event) => setUnitForm((current) => ({ ...current, rentAmount: event.target.value }))} /></Field>
          <Field label="Deposit amount"><input className={inputClass} type="number" value={unitForm.depositAmount ?? ""} onChange={(event) => setUnitForm((current) => ({ ...current, depositAmount: event.target.value }))} /></Field>
        </div>
        <Field label="Notes"><textarea className={`${inputClass} min-h-24`} value={unitForm.notes ?? ""} onChange={(event) => setUnitForm((current) => ({ ...current, notes: event.target.value }))} /></Field>
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClass} type="submit" disabled={saving || loading}>{saving ? "Saving..." : editingUnitId ? "Save unit" : "Create unit"}</button>
          <button className={secondaryButtonClass} type="button" onClick={() => { setUnitForm(emptyUnit(selectedPropertyId)); setEditingUnitId(""); }}>Clear</button>
        </div>
      </form>
      <div className="space-y-3">{units.length === 0 ? <EmptyState text="No units yet for this property." /> : null}{units.map((unit) => { const floor = floors.find((item) => item.id === unit.floorId); const unitType = unitTypes.find((item) => item.id === unit.unitTypeId); return <ListRow key={unit.id} title={unit.unitName} subtitle={`${unit.status} · ${money(unit.rentAmount)}`} meta={`${floor?.label || "No floor"} · ${unitType?.name || "No type"} · ${unit.unitCode || "No code"}`} onEdit={() => { setEditingUnitId(unit.id); setUnitForm(unit); setSelectedPropertyId(unit.propertyId); }} onDelete={() => deleteResource(`/api/units/${unit.id}`)} />; })}</div>
    </div>
  );
}

function TenantManager({
  loading,
  saving,
  properties,
  selectedPropertyId,
  tenantForm,
  setTenantForm,
  editingTenantId,
  setEditingTenantId,
  handleTenantSubmit,
  tenants,
  deleteResource,
  setSelectedPropertyId,
}: {
  loading: boolean;
  saving: boolean;
  properties: Property[];
  selectedPropertyId: string;
  tenantForm: Tenant;
  setTenantForm: React.Dispatch<React.SetStateAction<Tenant>>;
  editingTenantId: string;
  setEditingTenantId: (value: string) => void;
  handleTenantSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  tenants: Tenant[];
  deleteResource: (path: string) => Promise<void>;
  setSelectedPropertyId: (value: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <form className="grid gap-4" onSubmit={handleTenantSubmit}>
        <Field label="Property">
          <select className={inputClass} value={tenantForm.propertyId} onChange={(event) => { const value = event.target.value; setTenantForm((current) => ({ ...current, propertyId: value })); setSelectedPropertyId(value); }}>
            <option value="">Select property</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
          </select>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name"><input className={inputClass} value={tenantForm.fullName} onChange={(event) => setTenantForm((current) => ({ ...current, fullName: event.target.value }))} /></Field>
          <Field label="Phone"><input className={inputClass} value={tenantForm.phone} onChange={(event) => setTenantForm((current) => ({ ...current, phone: event.target.value }))} /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email"><input className={inputClass} value={tenantForm.email ?? ""} onChange={(event) => setTenantForm((current) => ({ ...current, email: event.target.value }))} /></Field>
          <Field label="National ID"><input className={inputClass} value={tenantForm.nationalId ?? ""} onChange={(event) => setTenantForm((current) => ({ ...current, nationalId: event.target.value }))} /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Next of kin name"><input className={inputClass} value={tenantForm.nextOfKinName ?? ""} onChange={(event) => setTenantForm((current) => ({ ...current, nextOfKinName: event.target.value }))} /></Field>
          <Field label="Next of kin phone"><input className={inputClass} value={tenantForm.nextOfKinPhone ?? ""} onChange={(event) => setTenantForm((current) => ({ ...current, nextOfKinPhone: event.target.value }))} /></Field>
        </div>
        <Field label="Notes"><textarea className={`${inputClass} min-h-24`} value={tenantForm.notes ?? ""} onChange={(event) => setTenantForm((current) => ({ ...current, notes: event.target.value }))} /></Field>
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClass} type="submit" disabled={saving || loading}>{saving ? "Saving..." : editingTenantId ? "Save tenant" : "Create tenant"}</button>
          <button className={secondaryButtonClass} type="button" onClick={() => { setTenantForm(emptyTenant(selectedPropertyId)); setEditingTenantId(""); }}>Clear</button>
        </div>
      </form>
      <div className="space-y-3">{tenants.length === 0 ? <EmptyState text="No tenants yet for this property." /> : null}{tenants.map((tenant) => <ListRow key={tenant.id} title={tenant.fullName} subtitle={tenant.phone} meta={`${tenant.email || "No email"} · ${tenant.nationalId || "No ID"}`} onEdit={() => { setEditingTenantId(tenant.id); setTenantForm(tenant); setSelectedPropertyId(tenant.propertyId); }} onDelete={() => deleteResource(`/api/tenants/${tenant.id}`)} />)}</div>
    </div>
  );
}

function LeaseManager({
  loading,
  saving,
  properties,
  selectedPropertyId,
  leaseForm,
  setLeaseForm,
  editingLeaseId,
  setEditingLeaseId,
  handleLeaseSubmit,
  leases,
  tenants,
  units,
  deleteResource,
  setSelectedPropertyId,
}: {
  loading: boolean;
  saving: boolean;
  properties: Property[];
  selectedPropertyId: string;
  leaseForm: Lease;
  setLeaseForm: React.Dispatch<React.SetStateAction<Lease>>;
  editingLeaseId: string;
  setEditingLeaseId: (value: string) => void;
  handleLeaseSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  leases: Lease[];
  tenants: Tenant[];
  units: Unit[];
  deleteResource: (path: string) => Promise<void>;
  setSelectedPropertyId: (value: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <form className="grid gap-4" onSubmit={handleLeaseSubmit}>
        <Field label="Property">
          <select className={inputClass} value={leaseForm.propertyId} onChange={(event) => { const value = event.target.value; setLeaseForm((current) => ({ ...current, propertyId: value })); setSelectedPropertyId(value); }}>
            <option value="">Select property</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
          </select>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Unit"><select className={inputClass} value={leaseForm.unitId} onChange={(event) => setLeaseForm((current) => ({ ...current, unitId: event.target.value }))}><option value="">Select unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitName}</option>)}</select></Field>
          <Field label="Tenant"><select className={inputClass} value={leaseForm.tenantId} onChange={(event) => setLeaseForm((current) => ({ ...current, tenantId: event.target.value }))}><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.fullName}</option>)}</select></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Start date"><input className={inputClass} type="date" value={dateInput(leaseForm.startDate)} onChange={(event) => setLeaseForm((current) => ({ ...current, startDate: event.target.value }))} /></Field>
          <Field label="End date"><input className={inputClass} type="date" value={dateInput(leaseForm.endDate)} onChange={(event) => setLeaseForm((current) => ({ ...current, endDate: event.target.value || null }))} /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Monthly rent"><input className={inputClass} type="number" value={leaseForm.monthlyRent} onChange={(event) => setLeaseForm((current) => ({ ...current, monthlyRent: event.target.value }))} /></Field>
          <Field label="Deposit amount"><input className={inputClass} type="number" value={leaseForm.depositAmount ?? ""} onChange={(event) => setLeaseForm((current) => ({ ...current, depositAmount: event.target.value }))} /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Move in date"><input className={inputClass} type="date" value={dateInput(leaseForm.moveInDate)} onChange={(event) => setLeaseForm((current) => ({ ...current, moveInDate: event.target.value || null }))} /></Field>
          <Field label="Grace days"><input className={inputClass} type="number" value={leaseForm.graceDays} onChange={(event) => setLeaseForm((current) => ({ ...current, graceDays: Number(event.target.value) || 0 }))} /></Field>
        </div>
        <Field label="Status"><select className={inputClass} value={leaseForm.status} onChange={(event) => setLeaseForm((current) => ({ ...current, status: event.target.value as LeaseStatus }))}>{leaseStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></Field>
        <Field label="Notes"><textarea className={`${inputClass} min-h-24`} value={leaseForm.notes ?? ""} onChange={(event) => setLeaseForm((current) => ({ ...current, notes: event.target.value }))} /></Field>
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClass} type="submit" disabled={saving || loading}>{saving ? "Saving..." : editingLeaseId ? "Save lease" : "Create lease"}</button>
          <button className={secondaryButtonClass} type="button" onClick={() => { setLeaseForm(emptyLease(selectedPropertyId)); setEditingLeaseId(""); }}>Clear</button>
        </div>
      </form>
      <div className="space-y-3">{leases.length === 0 ? <EmptyState text="No leases yet for this property." /> : null}{leases.map((lease) => <ListRow key={lease.id} title={`${units.find((unit) => unit.id === lease.unitId)?.unitName || "Unit"} → ${tenants.find((tenant) => tenant.id === lease.tenantId)?.fullName || "Tenant"}`} subtitle={`${lease.status} · ${money(lease.monthlyRent)}`} meta={`Starts ${dateInput(lease.startDate)} · Grace ${lease.graceDays} days`} onEdit={() => { setEditingLeaseId(lease.id); setLeaseForm(lease); setSelectedPropertyId(lease.propertyId); }} onDelete={() => deleteResource(`/api/leases/${lease.id}`)} />)}</div>
    </div>
  );
}

function PaymentManager({
  loading,
  saving,
  properties,
  selectedPropertyId,
  paymentForm,
  setPaymentForm,
  editingPaymentId,
  setEditingPaymentId,
  handlePaymentSubmit,
  payments,
  leases,
  tenants,
  deleteResource,
  setSelectedPropertyId,
}: {
  loading: boolean;
  saving: boolean;
  properties: Property[];
  selectedPropertyId: string;
  paymentForm: Payment;
  setPaymentForm: React.Dispatch<React.SetStateAction<Payment>>;
  editingPaymentId: string;
  setEditingPaymentId: (value: string) => void;
  handlePaymentSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  payments: Payment[];
  leases: Lease[];
  tenants: Tenant[];
  deleteResource: (path: string) => Promise<void>;
  setSelectedPropertyId: (value: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <form className="grid gap-4" onSubmit={handlePaymentSubmit}>
        <Field label="Property">
          <select className={inputClass} value={paymentForm.propertyId} onChange={(event) => { const value = event.target.value; setPaymentForm((current) => ({ ...current, propertyId: value })); setSelectedPropertyId(value); }}>
            <option value="">Select property</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
          </select>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Lease"><select className={inputClass} value={paymentForm.leaseId} onChange={(event) => setPaymentForm((current) => ({ ...current, leaseId: event.target.value }))}><option value="">Select lease</option>{leases.map((lease) => <option key={lease.id} value={lease.id}>{unitsLabel(lease, tenants)}</option>)}</select></Field>
          <Field label="Tenant"><select className={inputClass} value={paymentForm.tenantId} onChange={(event) => setPaymentForm((current) => ({ ...current, tenantId: event.target.value }))}><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.fullName}</option>)}</select></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Amount"><input className={inputClass} type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} /></Field>
          <Field label="Received at"><input className={inputClass} type="datetime-local" value={dateTimeLocal(paymentForm.receivedAt)} onChange={(event) => setPaymentForm((current) => ({ ...current, receivedAt: event.target.value }))} /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Method"><select className={inputClass} value={paymentForm.method} onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value as PaymentMethod }))}>{paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></Field>
          <Field label="Status"><select className={inputClass} value={paymentForm.status} onChange={(event) => setPaymentForm((current) => ({ ...current, status: event.target.value as PaymentStatus }))}>{paymentStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></Field>
        </div>
        <Field label="Reference"><input className={inputClass} value={paymentForm.reference ?? ""} onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} /></Field>
        <Field label="Notes"><textarea className={`${inputClass} min-h-24`} value={paymentForm.notes ?? ""} onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))} /></Field>
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClass} type="submit" disabled={saving || loading}>{saving ? "Saving..." : editingPaymentId ? "Save payment" : "Create payment"}</button>
          <button className={secondaryButtonClass} type="button" onClick={() => { setPaymentForm(emptyPayment(selectedPropertyId)); setEditingPaymentId(""); }}>Clear</button>
        </div>
      </form>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
        M-Pesa receipts can be auto-matched from Daraja when the callback includes a phone number or reference code that maps to an active tenant lease.
      </div>
      <div className="space-y-3">{payments.length === 0 ? <EmptyState text="No payments yet for this property." /> : null}{payments.map((payment) => <ListRow key={payment.id} title={`${money(payment.amount)} · ${payment.method}`} subtitle={`${payment.status}${payment.reference ? ` · Ref ${payment.reference}` : ""}`} meta={`${tenants.find((tenant) => tenant.id === payment.tenantId)?.fullName || "Tenant"} · ${dateTimeLocal(payment.receivedAt)}`} onEdit={() => { setEditingPaymentId(payment.id); setPaymentForm(payment); setSelectedPropertyId(payment.propertyId); }} onDelete={() => deleteResource(`/api/payments/${payment.id}`)} />)}</div>
    </div>
  );
}

function unitsLabel(lease: Lease, tenants: Tenant[]) {
  return `${lease.id.slice(0, 8)} · ${tenants.find((tenant) => tenant.id === lease.tenantId)?.fullName || "Tenant"}`;
}

function dateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">{text}</div>;
}

function ListRow({ title, subtitle, meta, onEdit, onDelete }: { title: string; subtitle: string; meta: string; onEdit: () => void; onDelete: () => void; }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-semibold text-slate-50">{title}</div>
          <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{meta}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <TableButton onClick={onEdit}>Edit</TableButton>
          <TableDangerButton onClick={onDelete}>Delete</TableDangerButton>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TableButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800" type="button" onClick={onClick}>{children}</button>;
}

function TableDangerButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:border-rose-400/40 hover:bg-rose-500/20" type="button" onClick={onClick}>{children}</button>;
}

const inputClass =
  "w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10";

const primaryButtonClass =
  "rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300";

const secondaryButtonClass =
  "rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";
