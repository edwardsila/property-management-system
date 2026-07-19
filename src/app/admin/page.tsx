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

type BootstrapPayload = {
  properties: Property[];
  floors: Floor[];
  unitTypes: UnitType[];
  units: Unit[];
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

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as T & { error?: string } | null;

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
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  const [propertyForm, setPropertyForm] = useState<Property>(emptyProperty());
  const [floorForm, setFloorForm] = useState<Floor>(emptyFloor());
  const [unitTypeForm, setUnitTypeForm] = useState<UnitType>(emptyUnitType());
  const [unitForm, setUnitForm] = useState<Unit>(emptyUnit());

  const [editingPropertyId, setEditingPropertyId] = useState("");
  const [editingFloorId, setEditingFloorId] = useState("");
  const [editingUnitTypeId, setEditingUnitTypeId] = useState("");
  const [editingUnitId, setEditingUnitId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId) ?? null,
    [properties, selectedPropertyId],
  );

  const propertyFloors = useMemo(
    () => floors.filter((floor) => floor.propertyId === selectedPropertyId),
    [floors, selectedPropertyId],
  );

  const propertyUnitTypes = useMemo(
    () => unitTypes.filter((unitType) => unitType.propertyId === selectedPropertyId),
    [selectedPropertyId, unitTypes],
  );

  const propertyUnits = useMemo(
    () => units.filter((unit) => unit.propertyId === selectedPropertyId),
    [selectedPropertyId, units],
  );

  async function refresh() {
    const data = await requestJson<BootstrapPayload>("/api/bootstrap");
    setProperties(data.properties);
    setFloors(data.floors);
    setUnitTypes(data.unitTypes);
    setUnits(data.units);
    setSelectedPropertyId((current) => current || data.properties[0]?.id || "");
  }

  async function handlePropertySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!propertyForm.name.trim() || !propertyForm.location.trim()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingPropertyId) {
        await requestJson(`/api/properties/${editingPropertyId}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...propertyForm,
            slug: propertyForm.slug || slugify(propertyForm.name),
          }),
        });
      } else {
        await requestJson(`/api/properties`, {
          method: "POST",
          body: JSON.stringify({
            ...propertyForm,
            slug: propertyForm.slug || slugify(propertyForm.name),
          }),
        });
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
        await requestJson(`/api/floors/${editingFloorId}`, {
          method: "PATCH",
          body: JSON.stringify(floorForm),
        });
      } else {
        await requestJson(`/api/properties/${floorForm.propertyId}/floors`, {
          method: "POST",
          body: JSON.stringify(floorForm),
        });
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

  function handleEditProperty(property: Property) {
    setEditingPropertyId(property.id);
    setPropertyForm(property);
  }

  function handleEditFloor(floor: Floor) {
    setEditingFloorId(floor.id);
    setFloorForm(floor);
    setSelectedPropertyId(floor.propertyId);
  }

  function handleEditUnitType(unitType: UnitType) {
    setEditingUnitTypeId(unitType.id);
    setUnitTypeForm(unitType);
    setSelectedPropertyId(unitType.propertyId);
  }

  function handleEditUnit(unit: Unit) {
    setEditingUnitId(unit.id);
    setUnitForm(unit);
    setSelectedPropertyId(unit.propertyId);
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
        await requestJson(`/api/unit-types/${editingUnitTypeId}`, {
          method: "PATCH",
          body: JSON.stringify(unitTypeForm),
        });
      } else {
        await requestJson(`/api/properties/${unitTypeForm.propertyId}/unit-types`, {
          method: "POST",
          body: JSON.stringify(unitTypeForm),
        });
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
        await requestJson(`/api/units/${editingUnitId}`, {
          method: "PATCH",
          body: JSON.stringify(unitForm),
        });
      } else {
        await requestJson(`/api/properties/${unitForm.propertyId}/units`, {
          method: "POST",
          body: JSON.stringify(unitForm),
        });
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
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12">
      <section className="rounded-[2rem] border border-amber-950/10 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-900/10 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900">
              Database-backed setup workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Create properties, then configure floors, unit types, and actual unit names.
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              This screen now writes to Postgres through Prisma. The order is still the same: register the property, then add building sections, then define unit types, and finally enter the unit names and statuses people use on the ground.
            </p>
          </div>
          <Link className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" href="/">
            Back to overview
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {propertySummary.map((item) => (
            <article key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{loading ? "..." : item.value}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-white/55">Current property</div>
              <h2 className="mt-2 text-2xl font-semibold">{selectedProperty?.name ?? "No property selected"}</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/60">
              live model
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {properties.map((property) => (
              <button
                key={property.id}
                type="button"
                onClick={() => {
                  setSelectedPropertyId(property.id);
                  setFloorForm(emptyFloor(property.id));
                  setUnitTypeForm(emptyUnitType(property.id));
                  setUnitForm(emptyUnit(property.id));
                }}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedPropertyId === property.id
                    ? "border-amber-400 bg-white/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{property.name}</div>
                    <div className="mt-1 text-sm text-white/60">{property.location}</div>
                  </div>
                  <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                    {property.type.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-3 text-sm text-white/65">{property.slug}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80"
                    onClick={() => handleEditProperty(property)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100"
                    onClick={() => deleteResource(`/api/properties/${property.id}`)}
                  >
                    Delete
                  </button>
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Property CRUD</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Add or update a property</h2>
            </div>
            {editingPropertyId ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Editing</span> : null}
          </div>

          <form className="mt-6 grid gap-4" onSubmit={handlePropertySubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Property name">
                <input
                  className={inputClass}
                  value={propertyForm.name}
                  onChange={(event) => setPropertyForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Mabati Court"
                />
              </Field>
              <Field label="Slug">
                <input
                  className={inputClass}
                  value={propertyForm.slug}
                  onChange={(event) => setPropertyForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="mabati-court"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Property type">
                <select
                  className={inputClass}
                  value={propertyForm.type}
                  onChange={(event) =>
                    setPropertyForm((current) => ({
                      ...current,
                      type: event.target.value as PropertyType,
                    }))
                  }
                >
                  {propertyTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Location">
                <input
                  className={inputClass}
                  value={propertyForm.location}
                  onChange={(event) => setPropertyForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Kasarani, Nairobi"
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                className={`${inputClass} min-h-24`}
                value={propertyForm.description ?? ""}
                onChange={(event) => setPropertyForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Brief description of the property."
              />
            </Field>

            <Field label="Notes">
              <textarea
                className={`${inputClass} min-h-28`}
                value={propertyForm.notes ?? ""}
                onChange={(event) => setPropertyForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Anything useful for caretakers and owners."
              />
            </Field>

            <div className="flex flex-wrap gap-3">
              <button className={primaryButtonClass} type="submit" disabled={saving || loading}>
                {saving ? "Saving..." : editingPropertyId ? "Save property" : "Create property"}
              </button>
              <button
                className={secondaryButtonClass}
                type="button"
                onClick={() => {
                  setPropertyForm(emptyProperty());
                  setEditingPropertyId("");
                }}
              >
                Clear
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <CrudPanel
          title="Floors and sections"
          eyebrow="Floor CRUD"
          description="Use this for real floors, ground-level labels, or compound sections when the building does not follow strict floor numbering."
          form={
            <form className="mt-6 grid gap-4" onSubmit={handleFloorSubmit}>
              <Field label="Property">
                <select
                  className={inputClass}
                  value={floorForm.propertyId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFloorForm((current) => ({ ...current, propertyId: value }));
                    setSelectedPropertyId(value);
                    setUnitForm((current) => ({ ...current, propertyId: value }));
                    setUnitTypeForm((current) => ({ ...current, propertyId: value }));
                  }}
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Label">
                <input
                  className={inputClass}
                  value={floorForm.label}
                  onChange={(event) => setFloorForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Ground, 1st Floor, Upper block"
                />
              </Field>

              <Field label="Sort order">
                <input
                  className={inputClass}
                  type="number"
                  value={floorForm.sortOrder}
                  onChange={(event) =>
                    setFloorForm((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))
                  }
                />
              </Field>

              <Field label="Notes">
                <textarea
                  className={`${inputClass} min-h-24`}
                  value={floorForm.notes ?? ""}
                  onChange={(event) => setFloorForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Any helpful caretaker note."
                />
              </Field>

              <div className="flex flex-wrap gap-3">
                <button className={primaryButtonClass} type="submit" disabled={saving || loading}>
                  {saving ? "Saving..." : editingFloorId ? "Save floor" : "Create floor"}
                </button>
                <button
                  className={secondaryButtonClass}
                  type="button"
                  onClick={() => {
                    setFloorForm(emptyFloor(selectedPropertyId));
                    setEditingFloorId("");
                  }}
                >
                  Clear
                </button>
              </div>
            </form>
          }
          table={
            <div className="mt-6 space-y-3">
              {propertyFloors.length === 0 ? <EmptyState text="No floors yet for this property." /> : null}
              {propertyFloors.map((floor) => (
                <ListRow
                  key={floor.id}
                  title={floor.label}
                  subtitle={`Order ${floor.sortOrder}`}
                  meta={floor.notes || "No notes"}
                  onEdit={() => handleEditFloor(floor)}
                  onDelete={() => deleteResource(`/api/floors/${floor.id}`)}
                />
              ))}
            </div>
          }
        />

        <CrudPanel
          title="Unit types"
          eyebrow="Type CRUD"
          description="Define the property-specific labels and their default rent and deposit, because every building can price them differently."
          form={
            <form className="mt-6 grid gap-4" onSubmit={handleUnitTypeSubmit}>
              <Field label="Property">
                <select
                  className={inputClass}
                  value={unitTypeForm.propertyId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setUnitTypeForm((current) => ({ ...current, propertyId: value }));
                    setSelectedPropertyId(value);
                    setFloorForm((current) => ({ ...current, propertyId: value }));
                    setUnitForm((current) => ({ ...current, propertyId: value }));
                  }}
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Type name">
                <input
                  className={inputClass}
                  value={unitTypeForm.name}
                  onChange={(event) => setUnitTypeForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Bedsitter, 1 Bedroom, Shop"
                />
              </Field>

              <Field label="Description">
                <textarea
                  className={`${inputClass} min-h-24`}
                  value={unitTypeForm.description ?? ""}
                  onChange={(event) =>
                    setUnitTypeForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="What makes this unit type unique."
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Default rent">
                  <input
                    className={inputClass}
                    type="number"
                    value={unitTypeForm.defaultRent ?? ""}
                    onChange={(event) =>
                      setUnitTypeForm((current) => ({ ...current, defaultRent: event.target.value }))
                    }
                    placeholder="15000"
                  />
                </Field>
                <Field label="Default deposit">
                  <input
                    className={inputClass}
                    type="number"
                    value={unitTypeForm.defaultDeposit ?? ""}
                    onChange={(event) =>
                      setUnitTypeForm((current) => ({ ...current, defaultDeposit: event.target.value }))
                    }
                    placeholder="15000"
                  />
                </Field>
              </div>

              <Field label="Sort order">
                <input
                  className={inputClass}
                  type="number"
                  value={unitTypeForm.sortOrder}
                  onChange={(event) =>
                    setUnitTypeForm((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))
                  }
                />
              </Field>

              <div className="flex flex-wrap gap-3">
                <button className={primaryButtonClass} type="submit" disabled={saving || loading}>
                  {saving ? "Saving..." : editingUnitTypeId ? "Save type" : "Create type"}
                </button>
                <button
                  className={secondaryButtonClass}
                  type="button"
                  onClick={() => {
                    setUnitTypeForm(emptyUnitType(selectedPropertyId));
                    setEditingUnitTypeId("");
                  }}
                >
                  Clear
                </button>
              </div>
            </form>
          }
          table={
            <div className="mt-6 space-y-3">
              {propertyUnitTypes.length === 0 ? <EmptyState text="No unit types yet for this property." /> : null}
              {propertyUnitTypes.map((unitType) => (
                <ListRow
                  key={unitType.id}
                  title={unitType.name}
                  subtitle={`${money(unitType.defaultRent)} default rent`}
                  meta={unitType.description || "No description"}
                  onEdit={() => handleEditUnitType(unitType)}
                  onDelete={() => deleteResource(`/api/unit-types/${unitType.id}`)}
                />
              ))}
            </div>
          }
        />

        <CrudPanel
          title="Units"
          eyebrow="Unit CRUD"
          description="Enter the actual unit names used onsite, then link each one to a floor and unit type when needed."
          form={
            <form className="mt-6 grid gap-4" onSubmit={handleUnitSubmit}>
              <Field label="Property">
                <select
                  className={inputClass}
                  value={unitForm.propertyId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setUnitForm((current) => ({ ...current, propertyId: value, floorId: null, unitTypeId: null }));
                    setSelectedPropertyId(value);
                    setFloorForm((current) => ({ ...current, propertyId: value }));
                    setUnitTypeForm((current) => ({ ...current, propertyId: value }));
                  }}
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Unit name">
                  <input
                    className={inputClass}
                    value={unitForm.unitName}
                    onChange={(event) => setUnitForm((current) => ({ ...current, unitName: event.target.value }))}
                    placeholder="A1, G-02, House 12"
                  />
                </Field>
                <Field label="Unit code">
                  <input
                    className={inputClass}
                    value={unitForm.unitCode ?? ""}
                    onChange={(event) => setUnitForm((current) => ({ ...current, unitCode: event.target.value }))}
                    placeholder="Optional code"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Floor / section">
                  <select
                    className={inputClass}
                    value={unitForm.floorId ?? ""}
                    onChange={(event) => setUnitForm((current) => ({ ...current, floorId: event.target.value || null }))}
                  >
                    <option value="">Not assigned</option>
                    {floors
                      .filter((floor) => floor.propertyId === unitForm.propertyId)
                      .map((floor) => (
                        <option key={floor.id} value={floor.id}>
                          {floor.label}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Unit type">
                  <select
                    className={inputClass}
                    value={unitForm.unitTypeId ?? ""}
                    onChange={(event) => setUnitForm((current) => ({ ...current, unitTypeId: event.target.value || null }))}
                  >
                    <option value="">Not assigned</option>
                    {unitTypes
                      .filter((unitType) => unitType.propertyId === unitForm.propertyId)
                      .map((unitType) => (
                        <option key={unitType.id} value={unitType.id}>
                          {unitType.name}
                        </option>
                      ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Status">
                  <select
                    className={inputClass}
                    value={unitForm.status}
                    onChange={(event) =>
                      setUnitForm((current) => ({ ...current, status: event.target.value as UnitStatus }))
                    }
                  >
                    {unitStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Rent amount">
                  <input
                    className={inputClass}
                    type="number"
                    value={unitForm.rentAmount ?? ""}
                    onChange={(event) => setUnitForm((current) => ({ ...current, rentAmount: event.target.value }))}
                    placeholder="15000"
                  />
                </Field>
                <Field label="Deposit amount">
                  <input
                    className={inputClass}
                    type="number"
                    value={unitForm.depositAmount ?? ""}
                    onChange={(event) => setUnitForm((current) => ({ ...current, depositAmount: event.target.value }))}
                    placeholder="15000"
                  />
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  className={`${inputClass} min-h-24`}
                  value={unitForm.notes ?? ""}
                  onChange={(event) => setUnitForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Occupancy notes, meter details, or caretaker comments."
                />
              </Field>

              <div className="flex flex-wrap gap-3">
                <button className={primaryButtonClass} type="submit" disabled={saving || loading}>
                  {saving ? "Saving..." : editingUnitId ? "Save unit" : "Create unit"}
                </button>
                <button
                  className={secondaryButtonClass}
                  type="button"
                  onClick={() => {
                    setUnitForm(emptyUnit(selectedPropertyId));
                    setEditingUnitId("");
                  }}
                >
                  Clear
                </button>
              </div>
            </form>
          }
          table={
            <div className="mt-6 space-y-3">
              {propertyUnits.length === 0 ? <EmptyState text="No units yet for this property." /> : null}
              {propertyUnits.map((unit) => {
                const floor = floors.find((item) => item.id === unit.floorId);
                const unitType = unitTypes.find((item) => item.id === unit.unitTypeId);

                return (
                  <ListRow
                    key={unit.id}
                    title={unit.unitName}
                    subtitle={`${unit.status} · ${money(unit.rentAmount)}`}
                    meta={`${floor?.label || "No floor"} · ${unitType?.name || "No type"} · ${unit.unitCode || "No code"}`}
                    onEdit={() => handleEditUnit(unit)}
                    onDelete={() => deleteResource(`/api/units/${unit.id}`)}
                  />
                );
              })}
            </div>
          }
        />
      </section>
    </main>
  );
}

function CrudPanel({
  title,
  eyebrow,
  description,
  form,
  table,
}: {
  title: string;
  eyebrow: string;
  description: string;
  form: React.ReactNode;
  table: React.ReactNode;
}) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">{eyebrow}</div>
        <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
        <p className="text-sm leading-7 text-slate-600">{description}</p>
      </div>
      {form}
      {table}
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">{text}</div>;
}

function ListRow({
  title,
  subtitle,
  meta,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  meta: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-semibold text-slate-950">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{meta}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <TableButton type="button" onClick={onEdit}>
            Edit
          </TableButton>
          <TableDangerButton type="button" onClick={onDelete}>
            Delete
          </TableDangerButton>
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

function TableButton({
  type,
  onClick,
  children,
}: {
  type: "button" | "submit";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
      type={type}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TableDangerButton({
  type,
  onClick,
  children,
}: {
  type: "button" | "submit";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
      type={type}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10";

const primaryButtonClass =
  "rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800";

const secondaryButtonClass =
  "rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900";
