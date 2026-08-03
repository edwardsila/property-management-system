"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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

const badgeColors: Record<string, string> = {
  ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  CONFIRMED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  OCCUPIED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  RESERVED: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  DRAFT: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  VACANT: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  MAINTENANCE: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  REVERSED: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  TERMINATED: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  ENDED: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  MPESA: "border-teal-500/30 bg-teal-500/10 text-teal-300",
  BANK: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  CASH: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  OTHER: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

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

function dateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthsElapsed(value: string, now: Date) {
  const start = new Date(value);

  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
}

function isSameMonth(value: string, now: Date) {
  const date = new Date(value);

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
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

function leaseLabel(lease: Lease, units: Unit[], tenants: Tenant[]) {
  const unit = units.find((item) => item.id === lease.unitId);
  const tenant = tenants.find((item) => item.id === lease.tenantId);

  return `${unit?.unitName ?? "Unknown unit"} → ${tenant?.fullName ?? "Unknown tenant"}`;
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

const sectionLabels: Record<string, string> = {
  properties: "Properties",
  units: "Units",
  tenants: "Tenants",
  leases: "Leases",
  payments: "Payments",
};

type SectionId = keyof typeof sectionLabels;
type ToastState = { type: "success" | "error"; message: string } | null;

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
  const [toast, setToast] = useState<ToastState>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("properties");

  const [tenantSearch, setTenantSearch] = useState("");
  const [unitSearch, setUnitSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function notify(type: "success" | "error", message: string) {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  function resetForms(propertyId = selectedPropertyId) {
    setFloorForm(emptyFloor(propertyId));
    setUnitTypeForm(emptyUnitType(propertyId));
    setUnitForm(emptyUnit(propertyId));
    setTenantForm(emptyTenant(propertyId));
    setLeaseForm(emptyLease(propertyId));
    setPaymentForm(emptyPayment(propertyId));
    setEditingFloorId("");
    setEditingUnitTypeId("");
    setEditingUnitId("");
    setEditingTenantId("");
    setEditingLeaseId("");
    setEditingPaymentId("");
  }

  function onSelectProperty(propertyId: string) {
    setSelectedPropertyId(propertyId);
    resetForms(propertyId);
  }

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

        const firstId = data.properties[0]?.id ?? "";
        setSelectedPropertyId(firstId);
        resetForms(firstId);
      } catch (requestError) {
        if (active) {
          notify("error", requestError instanceof Error ? requestError.message : "Failed to load workspace");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProperty = useMemo(() => properties.find((property) => property.id === selectedPropertyId) ?? null, [properties, selectedPropertyId]);

  const propertyFloors = useMemo(() => floors.filter((floor) => floor.propertyId === selectedPropertyId), [floors, selectedPropertyId]);
  const propertyUnitTypes = useMemo(() => unitTypes.filter((unitType) => unitType.propertyId === selectedPropertyId), [selectedPropertyId, unitTypes]);
  const propertyUnits = useMemo(() => units.filter((unit) => unit.propertyId === selectedPropertyId), [selectedPropertyId, units]);
  const propertyTenants = useMemo(() => tenants.filter((tenant) => tenant.propertyId === selectedPropertyId), [selectedPropertyId, tenants]);
  const propertyLeases = useMemo(() => leases.filter((lease) => lease.propertyId === selectedPropertyId), [leases, selectedPropertyId]);
  const propertyPayments = useMemo(() => payments.filter((payment) => payment.propertyId === selectedPropertyId), [payments, selectedPropertyId]);

  const activeLeasesCount = useMemo(() => leases.filter((lease) => lease.status === "ACTIVE").length, [leases]);
  const confirmedMpesaPayments = useMemo(
    () => payments.filter((payment) => payment.method === "MPESA" && payment.status === "CONFIRMED").length,
    [payments],
  );

  const activeLeaseByUnit = useMemo(() => {
    const map = new Map<string, Lease>();

    for (const lease of leases) {
      if (lease.status !== "ACTIVE" || map.has(lease.unitId)) {
        continue;
      }

      map.set(lease.unitId, lease);
    }

    return map;
  }, [leases]);

  const occupiedUnitIds = useMemo(() => new Set(activeLeaseByUnit.keys()), [activeLeaseByUnit]);
  const occupiedUnits = useMemo(() => units.filter((unit) => occupiedUnitIds.has(unit.id)).length, [occupiedUnitIds, units]);
  const occupancyRate = useMemo(() => (units.length ? Math.round((occupiedUnits / units.length) * 100) : 0), [occupiedUnits, units.length]);

  const expectedMonthlyRent = useMemo(
    () => leases.filter((lease) => lease.status === "ACTIVE").reduce((total, lease) => total + Number(lease.monthlyRent || 0), 0),
    [leases],
  );

  const collectedThisMonth = useMemo(() => {
    const now = new Date();

    return payments
      .filter((payment) => payment.status === "CONFIRMED" && isSameMonth(payment.receivedAt, now))
      .reduce((total, payment) => total + Number(payment.amount || 0), 0);
  }, [payments]);

  const leaseArrears = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();

    for (const lease of leases) {
      if (lease.status !== "ACTIVE") {
        continue;
      }

      const months = Math.max(1, monthsElapsed(lease.startDate, now));
      const expected = months * Number(lease.monthlyRent || 0);
      const paid = payments
        .filter((payment) => payment.leaseId === lease.id && payment.status === "CONFIRMED")
        .reduce((total, payment) => total + Number(payment.amount || 0), 0);
      const owed = Math.max(0, expected - paid);

      map.set(lease.id, owed);
    }

    return map;
  }, [leases, payments]);

  const arrearsTotal = useMemo(() => Array.from(leaseArrears.values()).reduce((total, value) => total + value, 0), [leaseArrears]);
  const overdueLeases = useMemo(() => Array.from(leaseArrears.values()).filter((value) => value > 0).length, [leaseArrears]);

  const unitsByProperty = useMemo(() => {
    const map = new Map<string, number>();

    for (const unit of units) {
      map.set(unit.propertyId, (map.get(unit.propertyId) ?? 0) + 1);
    }

    return map;
  }, [units]);

  const activeLeasesByProperty = useMemo(() => {
    const map = new Map<string, number>();

    for (const lease of leases) {
      if (lease.status !== "ACTIVE") {
        continue;
      }

      map.set(lease.propertyId, (map.get(lease.propertyId) ?? 0) + 1);
    }

    return map;
  }, [leases]);

  const dashboardMetrics = useMemo(
    () => [
      { label: "Occupancy", value: units.length ? `${occupancyRate}%` : "—", note: `${occupiedUnits} of ${units.length} units occupied` },
      { label: "Monthly rent due", value: money(String(expectedMonthlyRent)), note: `${activeLeasesCount} active leases` },
      { label: "Collected this month", value: money(String(collectedThisMonth)), note: `${confirmedMpesaPayments} M-Pesa confirmed` },
      { label: "Arrears", value: money(String(arrearsTotal)), note: `${overdueLeases} leases overdue` },
    ],
    [activeLeasesCount, arrearsTotal, collectedThisMonth, confirmedMpesaPayments, expectedMonthlyRent, occupancyRate, occupiedUnits, overdueLeases, units.length],
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

    try {
      if (editingPropertyId) {
        await submitJson(`/api/properties/${editingPropertyId}`, "PATCH", propertyForm);
        notify("success", "Property updated");
      } else {
        const payload = { ...propertyForm, slug: propertyForm.slug || propertyForm.name.trim().toLowerCase().replace(/\s+/g, "-") };
        await submitJson("/api/properties", "POST", payload);
        notify("success", "Property created");
      }

      await refresh();
      setEditingPropertyId("");
      setPropertyForm(emptyProperty());
    } catch (requestError) {
      notify("error", requestError instanceof Error ? requestError.message : "Unable to save property");
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

    try {
      if (editingFloorId) {
        await submitJson(`/api/floors/${editingFloorId}`, "PATCH", floorForm);
        notify("success", "Floor updated");
      } else {
        await submitJson(`/api/properties/${floorForm.propertyId}/floors`, "POST", floorForm);
        notify("success", "Floor created");
      }

      await refresh();
      setEditingFloorId("");
      setFloorForm(emptyFloor(selectedPropertyId));
    } catch (requestError) {
      notify("error", requestError instanceof Error ? requestError.message : "Unable to save floor");
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

    try {
      if (editingUnitTypeId) {
        await submitJson(`/api/unit-types/${editingUnitTypeId}`, "PATCH", unitTypeForm);
        notify("success", "Unit type updated");
      } else {
        await submitJson(`/api/properties/${unitTypeForm.propertyId}/unit-types`, "POST", unitTypeForm);
        notify("success", "Unit type created");
      }

      await refresh();
      setEditingUnitTypeId("");
      setUnitTypeForm(emptyUnitType(selectedPropertyId));
    } catch (requestError) {
      notify("error", requestError instanceof Error ? requestError.message : "Unable to save unit type");
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

    try {
      if (editingUnitId) {
        await submitJson(`/api/units/${editingUnitId}`, "PATCH", unitForm);
        notify("success", "Unit updated");
      } else {
        await submitJson(`/api/properties/${unitForm.propertyId}/units`, "POST", unitForm);
        notify("success", "Unit created");
      }

      await refresh();
      setEditingUnitId("");
      setUnitForm(emptyUnit(selectedPropertyId));
    } catch (requestError) {
      notify("error", requestError instanceof Error ? requestError.message : "Unable to save unit");
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

    try {
      if (editingTenantId) {
        await submitJson(`/api/tenants/${editingTenantId}`, "PATCH", tenantForm);
        notify("success", "Tenant updated");
      } else {
        await submitJson(`/api/properties/${tenantForm.propertyId}/tenants`, "POST", tenantForm);
        notify("success", "Tenant created");
      }

      await refresh();
      setEditingTenantId("");
      setTenantForm(emptyTenant(selectedPropertyId));
    } catch (requestError) {
      notify("error", requestError instanceof Error ? requestError.message : "Unable to save tenant");
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

    try {
      if (editingLeaseId) {
        await submitJson(`/api/leases/${editingLeaseId}`, "PATCH", leaseForm);
        notify("success", "Lease updated");
      } else {
        await submitJson(`/api/properties/${leaseForm.propertyId}/leases`, "POST", leaseForm);
        notify("success", "Lease created");
      }

      await refresh();
      setEditingLeaseId("");
      setLeaseForm(emptyLease(selectedPropertyId));
    } catch (requestError) {
      notify("error", requestError instanceof Error ? requestError.message : "Unable to save lease");
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

    try {
      if (editingPaymentId) {
        await submitJson(`/api/payments/${editingPaymentId}`, "PATCH", paymentForm);
        notify("success", "Payment updated");
      } else {
        await submitJson(`/api/properties/${paymentForm.propertyId}/payments`, "POST", paymentForm);
        notify("success", "Payment recorded");
      }

      await refresh();
      setEditingPaymentId("");
      setPaymentForm(emptyPayment(selectedPropertyId));
    } catch (requestError) {
      notify("error", requestError instanceof Error ? requestError.message : "Unable to save payment");
    } finally {
      setSaving(false);
    }
  }

  async function deleteResource(path: string) {
    setSaving(true);

    try {
      await requestJson(path, { method: "DELETE" });
      await refresh();
      notify("success", "Item deleted");
    } catch (requestError) {
      notify("error", requestError instanceof Error ? requestError.message : "Unable to delete item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-2rem)] w-full px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid min-h-[calc(100vh-2rem)] gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-4 flex h-fit flex-col gap-6 rounded-md border border-slate-800 bg-slate-900 p-5">
          <div>
            <h1 className="text-lg font-semibold text-slate-50">Property Management</h1>
            <p className="mt-1 text-xs text-slate-500">Rental operations workspace</p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Workspace</div>
            <select className={inputClass} value={selectedPropertyId} onChange={(event) => onSelectProperty(event.target.value)}>
              <option value="">Select a property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>{property.name}</option>
              ))}
            </select>
            {selectedProperty ? (
              <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">
                {selectedProperty.location}
              </div>
            ) : null}
          </div>

          <nav className="space-y-1">
            {Object.entries(sectionLabels).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id as SectionId)}
                className={`flex w-full items-center rounded-md border px-4 py-2.5 text-left text-sm font-medium transition ${
                  activeSection === id
                    ? "border-slate-600 bg-slate-800 text-slate-50"
                    : "border-transparent bg-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <Link className="rounded-md border border-slate-700 bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-800" href="/">
            Back to overview
          </Link>
        </aside>

        <section className="flex flex-col gap-6">
          <header className="rounded-md border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{sectionLabels[activeSection]}</div>
                <h2 className="text-2xl font-semibold text-slate-50">
                  {selectedProperty?.name ?? "Select a property to get started"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                  <span>{selectedProperty?.location ?? "No workspace selected"}</span>
                  {selectedProperty ? <StatusBadge value={selectedProperty.type}>{selectedProperty.type.replace(/_/g, " ")}</StatusBadge> : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                <span>{units.length} units</span>
                <span className="text-slate-600">·</span>
                <span>{tenants.length} tenants</span>
                <span className="text-slate-600">·</span>
                <span>{activeLeasesCount} active leases</span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardMetrics.map((metric) => (
                <div key={metric.label} className="rounded-md border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</div>
                  <div className="mt-2 text-xl font-semibold text-slate-50">{metric.value}</div>
                  <div className="mt-1 text-sm text-slate-400">{metric.note}</div>
                </div>
              ))}
            </div>
          </header>

          {activeSection === "properties" ? (
            <SectionCard title="Properties" description="Top-level building or compound records. Click a row to open it as the workspace.">
              <PropertyManager
                loading={loading}
                saving={saving}
                properties={properties}
                selectedPropertyId={selectedPropertyId}
                propertyForm={propertyForm}
                setPropertyForm={setPropertyForm}
                editingPropertyId={editingPropertyId}
                setEditingPropertyId={setEditingPropertyId}
                handlePropertySubmit={handlePropertySubmit}
                onSelect={onSelectProperty}
                deleteResource={deleteResource}
                unitsByProperty={unitsByProperty}
                activeLeasesByProperty={activeLeasesByProperty}
              />
            </SectionCard>
          ) : null}

          {activeSection === "units" ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <SectionCard title="Floors and sections" description="Optional labels for floors, blocks, or compound sections.">
                <FloorManager
                  loading={loading}
                  saving={saving}
                  selectedPropertyId={selectedPropertyId}
                  floorForm={floorForm}
                  setFloorForm={setFloorForm}
                  editingFloorId={editingFloorId}
                  setEditingFloorId={setEditingFloorId}
                  handleFloorSubmit={handleFloorSubmit}
                  floors={propertyFloors}
                  units={propertyUnits}
                  deleteResource={deleteResource}
                />
              </SectionCard>

              <SectionCard title="Unit types" description="Property-specific categories like bedsitter, 1 bedroom, or shop.">
                <UnitTypeManager
                  loading={loading}
                  saving={saving}
                  selectedPropertyId={selectedPropertyId}
                  unitTypeForm={unitTypeForm}
                  setUnitTypeForm={setUnitTypeForm}
                  editingUnitTypeId={editingUnitTypeId}
                  setEditingUnitTypeId={setEditingUnitTypeId}
                  handleUnitTypeSubmit={handleUnitTypeSubmit}
                  unitTypes={propertyUnitTypes}
                  units={propertyUnits}
                  deleteResource={deleteResource}
                />
              </SectionCard>

              <div className="xl:col-span-2">
                <SectionCard title="Units" description="The actual unit names used on site, tied to a floor and unit type.">
                  <UnitManager
                    loading={loading}
                    saving={saving}
                    selectedPropertyId={selectedPropertyId}
                    unitForm={unitForm}
                    setUnitForm={setUnitForm}
                    editingUnitId={editingUnitId}
                    setEditingUnitId={setEditingUnitId}
                    handleUnitSubmit={handleUnitSubmit}
                    units={propertyUnits}
                    floors={propertyFloors}
                    unitTypes={propertyUnitTypes}
                    leases={propertyLeases}
                    tenants={propertyTenants}
                    search={unitSearch}
                    setSearch={setUnitSearch}
                    deleteResource={deleteResource}
                  />
                </SectionCard>
              </div>
            </div>
          ) : null}

          {activeSection === "tenants" ? (
            <SectionCard title="Tenants" description="Add occupants before you create leases.">
              <TenantManager
                loading={loading}
                saving={saving}
                selectedPropertyId={selectedPropertyId}
                tenantForm={tenantForm}
                setTenantForm={setTenantForm}
                editingTenantId={editingTenantId}
                setEditingTenantId={setEditingTenantId}
                handleTenantSubmit={handleTenantSubmit}
                tenants={propertyTenants}
                leases={propertyLeases}
                units={propertyUnits}
                search={tenantSearch}
                setSearch={setTenantSearch}
                deleteResource={deleteResource}
              />
            </SectionCard>
          ) : null}

          {activeSection === "leases" ? (
            <SectionCard title="Leases" description="Connect a tenant to a unit and keep the rental history.">
              <LeaseManager
                loading={loading}
                saving={saving}
                selectedPropertyId={selectedPropertyId}
                leaseForm={leaseForm}
                setLeaseForm={setLeaseForm}
                editingLeaseId={editingLeaseId}
                setEditingLeaseId={setEditingLeaseId}
                handleLeaseSubmit={handleLeaseSubmit}
                leases={propertyLeases}
                units={propertyUnits}
                tenants={propertyTenants}
                deleteResource={deleteResource}
              />
            </SectionCard>
          ) : null}

          {activeSection === "payments" ? (
            <SectionCard title="Payments" description="Cash, bank, or M-Pesa payments against a lease.">
              <PaymentManager
                loading={loading}
                saving={saving}
                selectedPropertyId={selectedPropertyId}
                paymentForm={paymentForm}
                setPaymentForm={setPaymentForm}
                editingPaymentId={editingPaymentId}
                setEditingPaymentId={setEditingPaymentId}
                handlePaymentSubmit={handlePaymentSubmit}
                payments={propertyPayments}
                leases={propertyLeases}
                units={propertyUnits}
                tenants={propertyTenants}
                search={paymentSearch}
                setSearch={setPaymentSearch}
                deleteResource={deleteResource}
              />
            </SectionCard>
          ) : null}
        </section>
      </div>

      {toast ? (
        <div
          className={`fixed right-4 top-4 z-50 max-w-sm rounded-md border px-4 py-3 text-sm shadow-lg ${
            toast.type === "error"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <article className="rounded-md border border-slate-800 bg-slate-900 p-6">
      <div className="space-y-1 border-b border-slate-800 pb-4">
        <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
        <p className="text-sm text-slate-400">{description}</p>
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
  editingPropertyId,
  setEditingPropertyId,
  handlePropertySubmit,
  onSelect,
  deleteResource,
  unitsByProperty,
  activeLeasesByProperty,
}: {
  loading: boolean;
  saving: boolean;
  properties: Property[];
  selectedPropertyId: string;
  propertyForm: Property;
  setPropertyForm: React.Dispatch<React.SetStateAction<Property>>;
  editingPropertyId: string;
  setEditingPropertyId: (value: string) => void;
  handlePropertySubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onSelect: (propertyId: string) => void;
  deleteResource: (path: string) => Promise<void>;
  unitsByProperty: Map<string, number>;
  activeLeasesByProperty: Map<string, number>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form className="grid gap-4" onSubmit={handlePropertySubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Property name">
            <input className={inputClass} value={propertyForm.name} onChange={(event) => setPropertyForm((current) => ({ ...current, name: event.target.value }))} placeholder="Mabati Court" />
          </Field>
          <Field label="Property type">
            <select className={inputClass} value={propertyForm.type} onChange={(event) => setPropertyForm((current) => ({ ...current, type: event.target.value as PropertyType }))}>
              {propertyTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Location">
          <input className={inputClass} value={propertyForm.location} onChange={(event) => setPropertyForm((current) => ({ ...current, location: event.target.value }))} placeholder="Kasarani, Nairobi" />
        </Field>

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

      <div>
        {properties.length === 0 ? <EmptyState text="No properties yet. Create the first one on the left." /> : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Location</Th>
                <Th className="text-right">Units</Th>
                <Th className="text-right">Occupied</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id} className={selectedPropertyId === property.id ? "bg-slate-800/40" : ""}>
                  <Td>
                    <button type="button" className="text-left font-medium text-slate-50 hover:text-white" onClick={() => onSelect(property.id)}>
                      {property.name}
                    </button>
                    <div className="text-xs text-slate-500">{property.slug}</div>
                  </Td>
                  <Td><StatusBadge value={property.type}>{property.type.replace(/_/g, " ")}</StatusBadge></Td>
                  <Td>{property.location}</Td>
                  <Td className="text-right">{unitsByProperty.get(property.id) ?? 0}</Td>
                  <Td className="text-right">{activeLeasesByProperty.get(property.id) ?? 0}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <TableButton onClick={() => setPropertyForm(property)}>Edit</TableButton>
                      <ConfirmButton onConfirm={() => deleteResource(`/api/properties/${property.id}`)}>Delete</ConfirmButton>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}

function FloorManager({
  loading,
  saving,
  selectedPropertyId,
  floorForm,
  setFloorForm,
  editingFloorId,
  setEditingFloorId,
  handleFloorSubmit,
  floors,
  units,
  deleteResource,
}: {
  loading: boolean;
  saving: boolean;
  selectedPropertyId: string;
  floorForm: Floor;
  setFloorForm: React.Dispatch<React.SetStateAction<Floor>>;
  editingFloorId: string;
  setEditingFloorId: (value: string) => void;
  handleFloorSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  floors: Floor[];
  units: Unit[];
  deleteResource: (path: string) => Promise<void>;
}) {
  if (!selectedPropertyId) {
    return <EmptyState text="Select a property workspace to manage floors." />;
  }

  return (
    <div className="grid gap-4">
      <form className="grid gap-4" onSubmit={handleFloorSubmit}>
        <Field label="Label">
          <input className={inputClass} value={floorForm.label} onChange={(event) => setFloorForm((current) => ({ ...current, label: event.target.value }))} placeholder="Ground, 1st Floor, Upper block" />
        </Field>
        <Field label="Sort order">
          <input className={inputClass} type="number" value={floorForm.sortOrder} onChange={(event) => setFloorForm((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))} />
        </Field>
        <Field label="Notes">
          <textarea className={`${inputClass} min-h-24`} value={floorForm.notes ?? ""} onChange={(event) => setFloorForm((current) => ({ ...current, notes: event.target.value }))} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClass} type="submit" disabled={saving || loading}>{saving ? "Saving..." : editingFloorId ? "Save floor" : "Create floor"}</button>
          <button className={secondaryButtonClass} type="button" onClick={() => { setFloorForm(emptyFloor(selectedPropertyId)); setEditingFloorId(""); }}>Clear</button>
        </div>
      </form>

      {floors.length === 0 ? <EmptyState text="No floors or sections yet for this property." /> : (
        <Table>
          <thead>
            <tr>
              <Th>Label</Th>
              <Th className="text-right">Units</Th>
              <Th className="text-right">Sort</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {floors.map((floor) => (
              <tr key={floor.id}>
                <Td className="font-medium text-slate-50">{floor.label}</Td>
                <Td className="text-right">{units.filter((unit) => unit.floorId === floor.id).length}</Td>
                <Td className="text-right">{floor.sortOrder}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <TableButton onClick={() => { setEditingFloorId(floor.id); setFloorForm(floor); }}>Edit</TableButton>
                    <ConfirmButton onConfirm={() => deleteResource(`/api/floors/${floor.id}`)}>Delete</ConfirmButton>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function UnitTypeManager({
  loading,
  saving,
  selectedPropertyId,
  unitTypeForm,
  setUnitTypeForm,
  editingUnitTypeId,
  setEditingUnitTypeId,
  handleUnitTypeSubmit,
  unitTypes,
  units,
  deleteResource,
}: {
  loading: boolean;
  saving: boolean;
  selectedPropertyId: string;
  unitTypeForm: UnitType;
  setUnitTypeForm: React.Dispatch<React.SetStateAction<UnitType>>;
  editingUnitTypeId: string;
  setEditingUnitTypeId: (value: string) => void;
  handleUnitTypeSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  unitTypes: UnitType[];
  units: Unit[];
  deleteResource: (path: string) => Promise<void>;
}) {
  if (!selectedPropertyId) {
    return <EmptyState text="Select a property workspace to manage unit types." />;
  }

  return (
    <div className="grid gap-4">
      <form className="grid gap-4" onSubmit={handleUnitTypeSubmit}>
        <Field label="Type name">
          <input className={inputClass} value={unitTypeForm.name} onChange={(event) => setUnitTypeForm((current) => ({ ...current, name: event.target.value }))} placeholder="Bedsitter, 1 Bedroom, Shop" />
        </Field>
        <Field label="Description">
          <textarea className={`${inputClass} min-h-20`} value={unitTypeForm.description ?? ""} onChange={(event) => setUnitTypeForm((current) => ({ ...current, description: event.target.value }))} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Default rent">
            <input className={inputClass} type="number" value={unitTypeForm.defaultRent ?? ""} onChange={(event) => setUnitTypeForm((current) => ({ ...current, defaultRent: event.target.value }))} />
          </Field>
          <Field label="Default deposit">
            <input className={inputClass} type="number" value={unitTypeForm.defaultDeposit ?? ""} onChange={(event) => setUnitTypeForm((current) => ({ ...current, defaultDeposit: event.target.value }))} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClass} type="submit" disabled={saving || loading}>{saving ? "Saving..." : editingUnitTypeId ? "Save type" : "Create type"}</button>
          <button className={secondaryButtonClass} type="button" onClick={() => { setUnitTypeForm(emptyUnitType(selectedPropertyId)); setEditingUnitTypeId(""); }}>Clear</button>
        </div>
      </form>

      {unitTypes.length === 0 ? <EmptyState text="No unit types yet for this property." /> : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th className="text-right">Default rent</Th>
              <Th className="text-right">Default deposit</Th>
              <Th className="text-right">Units</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {unitTypes.map((unitType) => (
              <tr key={unitType.id}>
                <Td className="font-medium text-slate-50">{unitType.name}</Td>
                <Td className="text-right">{money(unitType.defaultRent)}</Td>
                <Td className="text-right">{money(unitType.defaultDeposit)}</Td>
                <Td className="text-right">{units.filter((unit) => unit.unitTypeId === unitType.id).length}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <TableButton onClick={() => { setEditingUnitTypeId(unitType.id); setUnitTypeForm(unitType); }}>Edit</TableButton>
                    <ConfirmButton onConfirm={() => deleteResource(`/api/unit-types/${unitType.id}`)}>Delete</ConfirmButton>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function UnitManager({
  loading,
  saving,
  selectedPropertyId,
  unitForm,
  setUnitForm,
  editingUnitId,
  setEditingUnitId,
  handleUnitSubmit,
  units,
  floors,
  unitTypes,
  leases,
  tenants,
  search,
  setSearch,
  deleteResource,
}: {
  loading: boolean;
  saving: boolean;
  selectedPropertyId: string;
  unitForm: Unit;
  setUnitForm: React.Dispatch<React.SetStateAction<Unit>>;
  editingUnitId: string;
  setEditingUnitId: (value: string) => void;
  handleUnitSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  units: Unit[];
  floors: Floor[];
  unitTypes: UnitType[];
  leases: Lease[];
  tenants: Tenant[];
  search: string;
  setSearch: (value: string) => void;
  deleteResource: (path: string) => Promise<void>;
}) {
  if (!selectedPropertyId) {
    return <EmptyState text="Select a property workspace to manage units." />;
  }

  const activeLeaseByUnit = new Map<string, Lease>();
  for (const lease of leases) {
    if (lease.status === "ACTIVE" && !activeLeaseByUnit.has(lease.unitId)) {
      activeLeaseByUnit.set(lease.unitId, lease);
    }
  }

  const query = search.trim().toLowerCase();
  const visibleUnits = query
    ? units.filter((unit) => unit.unitName.toLowerCase().includes(query) || (unit.unitCode ?? "").toLowerCase().includes(query))
    : units;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form className="grid gap-4" onSubmit={handleUnitSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Unit name">
            <input className={inputClass} value={unitForm.unitName} onChange={(event) => setUnitForm((current) => ({ ...current, unitName: event.target.value }))} placeholder="A1, G-02, House 12" />
          </Field>
          <Field label="Unit code">
            <input className={inputClass} value={unitForm.unitCode ?? ""} onChange={(event) => setUnitForm((current) => ({ ...current, unitCode: event.target.value }))} placeholder="Optional code" />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Floor / section">
            <select className={inputClass} value={unitForm.floorId ?? ""} onChange={(event) => setUnitForm((current) => ({ ...current, floorId: event.target.value || null }))}>
              <option value="">Not assigned</option>
              {floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.label}</option>)}
            </select>
          </Field>
          <Field label="Unit type">
            <select className={inputClass} value={unitForm.unitTypeId ?? ""} onChange={(event) => setUnitForm((current) => ({ ...current, unitTypeId: event.target.value || null }))}>
              <option value="">Not assigned</option>
              {unitTypes.map((unitType) => <option key={unitType.id} value={unitType.id}>{unitType.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Status">
            <select className={inputClass} value={unitForm.status} onChange={(event) => setUnitForm((current) => ({ ...current, status: event.target.value as UnitStatus }))}>
              {unitStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </Field>
          <Field label="Rent amount">
            <input className={inputClass} type="number" value={unitForm.rentAmount ?? ""} onChange={(event) => setUnitForm((current) => ({ ...current, rentAmount: event.target.value }))} />
          </Field>
          <Field label="Deposit amount">
            <input className={inputClass} type="number" value={unitForm.depositAmount ?? ""} onChange={(event) => setUnitForm((current) => ({ ...current, depositAmount: event.target.value }))} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className={`${inputClass} min-h-24`} value={unitForm.notes ?? ""} onChange={(event) => setUnitForm((current) => ({ ...current, notes: event.target.value }))} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClass} type="submit" disabled={saving || loading}>{saving ? "Saving..." : editingUnitId ? "Save unit" : "Create unit"}</button>
          <button className={secondaryButtonClass} type="button" onClick={() => { setUnitForm(emptyUnit(selectedPropertyId)); setEditingUnitId(""); }}>Clear</button>
        </div>
      </form>

      <div className="grid gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search units by name or code" />
        {visibleUnits.length === 0 ? <EmptyState text={search ? "No units match your search." : "No units yet for this property."} /> : (
          <Table>
            <thead>
              <tr>
                <Th>Unit</Th>
                <Th>Floor</Th>
                <Th>Type</Th>
                <Th className="text-right">Rent</Th>
                <Th>Tenant</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {visibleUnits.map((unit) => {
                const floor = floors.find((item) => item.id === unit.floorId);
                const unitType = unitTypes.find((item) => item.id === unit.unitTypeId);
                const lease = activeLeaseByUnit.get(unit.id);
                const tenant = lease ? tenants.find((item) => item.id === lease.tenantId) : null;

                return (
                  <tr key={unit.id}>
                    <Td>
                      <div className="font-medium text-slate-50">{unit.unitName}</div>
                      {unit.unitCode ? <div className="text-xs text-slate-500">{unit.unitCode}</div> : null}
                    </Td>
                    <Td>{floor?.label ?? "—"}</Td>
                    <Td>{unitType?.name ?? "—"}</Td>
                    <Td className="text-right">{money(unit.rentAmount)}</Td>
                    <Td>{tenant?.fullName ?? "—"}</Td>
                    <Td><StatusBadge value={unit.status} /></Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <TableButton onClick={() => { setEditingUnitId(unit.id); setUnitForm(unit); }}>Edit</TableButton>
                        <ConfirmButton onConfirm={() => deleteResource(`/api/units/${unit.id}`)}>Delete</ConfirmButton>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}

function TenantManager({
  loading,
  saving,
  selectedPropertyId,
  tenantForm,
  setTenantForm,
  editingTenantId,
  setEditingTenantId,
  handleTenantSubmit,
  tenants,
  leases,
  units,
  search,
  setSearch,
  deleteResource,
}: {
  loading: boolean;
  saving: boolean;
  selectedPropertyId: string;
  tenantForm: Tenant;
  setTenantForm: React.Dispatch<React.SetStateAction<Tenant>>;
  editingTenantId: string;
  setEditingTenantId: (value: string) => void;
  handleTenantSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  tenants: Tenant[];
  leases: Lease[];
  units: Unit[];
  search: string;
  setSearch: (value: string) => void;
  deleteResource: (path: string) => Promise<void>;
}) {
  if (!selectedPropertyId) {
    return <EmptyState text="Select a property workspace to manage tenants." />;
  }

  const activeLeaseByTenant = new Map<string, Lease>();
  for (const lease of leases) {
    if (lease.status === "ACTIVE" && !activeLeaseByTenant.has(lease.tenantId)) {
      activeLeaseByTenant.set(lease.tenantId, lease);
    }
  }

  const query = search.trim().toLowerCase();
  const visibleTenants = query
    ? tenants.filter((tenant) =>
        tenant.fullName.toLowerCase().includes(query) ||
        tenant.phone.includes(query) ||
        (tenant.email ?? "").toLowerCase().includes(query),
      )
    : tenants;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form className="grid gap-4" onSubmit={handleTenantSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <input className={inputClass} value={tenantForm.fullName} onChange={(event) => setTenantForm((current) => ({ ...current, fullName: event.target.value }))} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={tenantForm.phone} onChange={(event) => setTenantForm((current) => ({ ...current, phone: event.target.value }))} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email">
            <input className={inputClass} value={tenantForm.email ?? ""} onChange={(event) => setTenantForm((current) => ({ ...current, email: event.target.value }))} />
          </Field>
          <Field label="National ID">
            <input className={inputClass} value={tenantForm.nationalId ?? ""} onChange={(event) => setTenantForm((current) => ({ ...current, nationalId: event.target.value }))} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Next of kin name">
            <input className={inputClass} value={tenantForm.nextOfKinName ?? ""} onChange={(event) => setTenantForm((current) => ({ ...current, nextOfKinName: event.target.value }))} />
          </Field>
          <Field label="Next of kin phone">
            <input className={inputClass} value={tenantForm.nextOfKinPhone ?? ""} onChange={(event) => setTenantForm((current) => ({ ...current, nextOfKinPhone: event.target.value }))} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className={`${inputClass} min-h-24`} value={tenantForm.notes ?? ""} onChange={(event) => setTenantForm((current) => ({ ...current, notes: event.target.value }))} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClass} type="submit" disabled={saving || loading}>{saving ? "Saving..." : editingTenantId ? "Save tenant" : "Create tenant"}</button>
          <button className={secondaryButtonClass} type="button" onClick={() => { setTenantForm(emptyTenant(selectedPropertyId)); setEditingTenantId(""); }}>Clear</button>
        </div>
      </form>

      <div className="grid gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search tenants by name, phone, or email" />
        {visibleTenants.length === 0 ? <EmptyState text={search ? "No tenants match your search." : "No tenants yet for this property."} /> : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Unit</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {visibleTenants.map((tenant) => {
                const lease = activeLeaseByTenant.get(tenant.id);
                const unit = lease ? units.find((item) => item.id === lease.unitId) : null;

                return (
                  <tr key={tenant.id}>
                    <Td className="font-medium text-slate-50">{tenant.fullName}</Td>
                    <Td>{tenant.phone}</Td>
                    <Td>{tenant.email ?? "—"}</Td>
                    <Td>{unit?.unitName ?? "—"}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <TableButton onClick={() => { setEditingTenantId(tenant.id); setTenantForm(tenant); }}>Edit</TableButton>
                        <ConfirmButton onConfirm={() => deleteResource(`/api/tenants/${tenant.id}`)}>Delete</ConfirmButton>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}

function LeaseManager({
  loading,
  saving,
  selectedPropertyId,
  leaseForm,
  setLeaseForm,
  editingLeaseId,
  setEditingLeaseId,
  handleLeaseSubmit,
  leases,
  units,
  tenants,
  deleteResource,
}: {
  loading: boolean;
  saving: boolean;
  selectedPropertyId: string;
  leaseForm: Lease;
  setLeaseForm: React.Dispatch<React.SetStateAction<Lease>>;
  editingLeaseId: string;
  setEditingLeaseId: (value: string) => void;
  handleLeaseSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  leases: Lease[];
  units: Unit[];
  tenants: Tenant[];
  deleteResource: (path: string) => Promise<void>;
}) {
  if (!selectedPropertyId) {
    return <EmptyState text="Select a property workspace to manage leases." />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form className="grid gap-4" onSubmit={handleLeaseSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Unit">
            <select className={inputClass} value={leaseForm.unitId} onChange={(event) => setLeaseForm((current) => ({ ...current, unitId: event.target.value }))}>
              <option value="">Select unit</option>
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitName}</option>)}
            </select>
          </Field>
          <Field label="Tenant">
            <select className={inputClass} value={leaseForm.tenantId} onChange={(event) => setLeaseForm((current) => ({ ...current, tenantId: event.target.value }))}>
              <option value="">Select tenant</option>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.fullName}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Start date">
            <input className={inputClass} type="date" value={dateInput(leaseForm.startDate)} onChange={(event) => setLeaseForm((current) => ({ ...current, startDate: event.target.value }))} />
          </Field>
          <Field label="End date">
            <input className={inputClass} type="date" value={dateInput(leaseForm.endDate)} onChange={(event) => setLeaseForm((current) => ({ ...current, endDate: event.target.value || null }))} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Monthly rent">
            <input className={inputClass} type="number" value={leaseForm.monthlyRent} onChange={(event) => setLeaseForm((current) => ({ ...current, monthlyRent: event.target.value }))} />
          </Field>
          <Field label="Deposit amount">
            <input className={inputClass} type="number" value={leaseForm.depositAmount ?? ""} onChange={(event) => setLeaseForm((current) => ({ ...current, depositAmount: event.target.value }))} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Move in date">
            <input className={inputClass} type="date" value={dateInput(leaseForm.moveInDate)} onChange={(event) => setLeaseForm((current) => ({ ...current, moveInDate: event.target.value || null }))} />
          </Field>
          <Field label="Grace days">
            <input className={inputClass} type="number" value={leaseForm.graceDays} onChange={(event) => setLeaseForm((current) => ({ ...current, graceDays: Number(event.target.value) || 0 }))} />
          </Field>
        </div>
        <Field label="Status">
          <select className={inputClass} value={leaseForm.status} onChange={(event) => setLeaseForm((current) => ({ ...current, status: event.target.value as LeaseStatus }))}>
            {leaseStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <textarea className={`${inputClass} min-h-24`} value={leaseForm.notes ?? ""} onChange={(event) => setLeaseForm((current) => ({ ...current, notes: event.target.value }))} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClass} type="submit" disabled={saving || loading}>{saving ? "Saving..." : editingLeaseId ? "Save lease" : "Create lease"}</button>
          <button className={secondaryButtonClass} type="button" onClick={() => { setLeaseForm(emptyLease(selectedPropertyId)); setEditingLeaseId(""); }}>Clear</button>
        </div>
      </form>

      {leases.length === 0 ? <EmptyState text="No leases yet for this property." /> : (
        <Table>
          <thead>
            <tr>
              <Th>Unit</Th>
              <Th>Tenant</Th>
              <Th>Status</Th>
              <Th className="text-right">Rent</Th>
              <Th>Start</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {leases.map((lease) => {
              const unit = units.find((item) => item.id === lease.unitId);
              const tenant = tenants.find((item) => item.id === lease.tenantId);

              return (
                <tr key={lease.id}>
                  <Td className="font-medium text-slate-50">{unit?.unitName ?? "—"}</Td>
                  <Td>{tenant?.fullName ?? "—"}</Td>
                  <Td><StatusBadge value={lease.status} /></Td>
                  <Td className="text-right">{money(lease.monthlyRent)}</Td>
                  <Td>{formatDate(lease.startDate)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <TableButton onClick={() => { setEditingLeaseId(lease.id); setLeaseForm(lease); }}>Edit</TableButton>
                      <ConfirmButton onConfirm={() => deleteResource(`/api/leases/${lease.id}`)}>Delete</ConfirmButton>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function PaymentManager({
  loading,
  saving,
  selectedPropertyId,
  paymentForm,
  setPaymentForm,
  editingPaymentId,
  setEditingPaymentId,
  handlePaymentSubmit,
  payments,
  leases,
  units,
  tenants,
  search,
  setSearch,
  deleteResource,
}: {
  loading: boolean;
  saving: boolean;
  selectedPropertyId: string;
  paymentForm: Payment;
  setPaymentForm: React.Dispatch<React.SetStateAction<Payment>>;
  editingPaymentId: string;
  setEditingPaymentId: (value: string) => void;
  handlePaymentSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  payments: Payment[];
  leases: Lease[];
  units: Unit[];
  tenants: Tenant[];
  search: string;
  setSearch: (value: string) => void;
  deleteResource: (path: string) => Promise<void>;
}) {
  if (!selectedPropertyId) {
    return <EmptyState text="Select a property workspace to manage payments." />;
  }

  const query = search.trim().toLowerCase();
  const visiblePayments = query
    ? payments.filter((payment) => {
        const lease = leases.find((item) => item.id === payment.leaseId);
        const unit = lease ? units.find((item) => item.id === lease.unitId) : null;
        const tenant = tenants.find((item) => item.id === payment.tenantId);
        const haystack = `${tenant?.fullName ?? ""} ${unit?.unitName ?? ""} ${payment.reference ?? ""}`.toLowerCase();

        return haystack.includes(query);
      })
    : payments;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form className="grid gap-4" onSubmit={handlePaymentSubmit}>
        <Field label="Lease">
          <select className={inputClass} value={paymentForm.leaseId} onChange={(event) => setPaymentForm((current) => ({ ...current, leaseId: event.target.value }))}>
            <option value="">Select lease</option>
            {leases.map((lease) => <option key={lease.id} value={lease.id}>{leaseLabel(lease, units, tenants)}</option>)}
          </select>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tenant">
            <select className={inputClass} value={paymentForm.tenantId} onChange={(event) => setPaymentForm((current) => ({ ...current, tenantId: event.target.value }))}>
              <option value="">Select tenant</option>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.fullName}</option>)}
            </select>
          </Field>
          <Field label="Amount">
            <input className={inputClass} type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Method">
            <select className={inputClass} value={paymentForm.method} onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value as PaymentMethod }))}>
              {paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={paymentForm.status} onChange={(event) => setPaymentForm((current) => ({ ...current, status: event.target.value as PaymentStatus }))}>
              {paymentStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Received at">
            <input className={inputClass} type="datetime-local" value={dateTimeLocal(paymentForm.receivedAt)} onChange={(event) => setPaymentForm((current) => ({ ...current, receivedAt: event.target.value }))} />
          </Field>
          <Field label="Reference">
            <input className={inputClass} value={paymentForm.reference ?? ""} onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} placeholder="Receipt or ref code" />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className={`${inputClass} min-h-24`} value={paymentForm.notes ?? ""} onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClass} type="submit" disabled={saving || loading}>{saving ? "Saving..." : editingPaymentId ? "Save payment" : "Record payment"}</button>
          <button className={secondaryButtonClass} type="button" onClick={() => { setPaymentForm(emptyPayment(selectedPropertyId)); setEditingPaymentId(""); }}>Clear</button>
        </div>
      </form>

      <div className="grid gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search payments by tenant, unit, or reference" />
        {visiblePayments.length === 0 ? <EmptyState text={search ? "No payments match your search." : "No payments yet for this property."} /> : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Tenant</Th>
                <Th>Unit</Th>
                <Th className="text-right">Amount</Th>
                <Th>Method</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {visiblePayments.map((payment) => {
                const lease = leases.find((item) => item.id === payment.leaseId);
                const unit = lease ? units.find((item) => item.id === lease.unitId) : null;
                const tenant = tenants.find((item) => item.id === payment.tenantId);

                return (
                  <tr key={payment.id}>
                    <Td>{formatDateTime(payment.receivedAt)}</Td>
                    <Td className="font-medium text-slate-50">{tenant?.fullName ?? "—"}</Td>
                    <Td>{unit?.unitName ?? "—"}</Td>
                    <Td className="text-right">{money(payment.amount)}</Td>
                    <Td><StatusBadge value={payment.method} /></Td>
                    <Td><StatusBadge value={payment.status} /></Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <TableButton onClick={() => { setEditingPaymentId(payment.id); setPaymentForm(payment); }}>Edit</TableButton>
                        <ConfirmButton onConfirm={() => deleteResource(`/api/payments/${payment.id}`)}>Delete</ConfirmButton>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-800">
      <table className="w-full min-w-[560px] border-collapse text-sm">{children}</table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border-b border-slate-800 bg-slate-950 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${className ?? ""}`}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-b border-slate-800/60 px-4 py-2.5 text-slate-300 ${className ?? ""}`}>{children}</td>;
}

function StatusBadge({ value, children }: { value: string; children?: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeColors[value] ?? "border-slate-500/30 bg-slate-500/10 text-slate-300"}`}>
      {children ?? value.replace(/_/g, " ")}
    </span>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <input
      className={inputClass}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
}

function ConfirmButton({ onConfirm, children }: { onConfirm: () => void; children: React.ReactNode }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) {
      return;
    }

    const timer = setTimeout(() => setArmed(false), 3000);

    return () => clearTimeout(timer);
  }, [armed]);

  if (armed) {
    return (
      <button
        className={`${dangerButtonClass} border-rose-400/60 bg-rose-500/20 text-rose-100`}
        type="button"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        Confirm
      </button>
    );
  }

  return (
    <button className={dangerButtonClass} type="button" onClick={() => setArmed(true)}>
      {children}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-400">{text}</div>;
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
  return <button className={tableButtonClass} type="button" onClick={onClick}>{children}</button>;
}

const tableButtonClass =
  "rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";

const dangerButtonClass =
  "rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:border-rose-400/40 hover:bg-rose-500/20";

const inputClass =
  "w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20";

const primaryButtonClass =
  "rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:opacity-50";

const secondaryButtonClass =
  "rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";
