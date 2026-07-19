import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PropertyRecord = Awaited<ReturnType<typeof prisma.property.findMany>>[number];
type FloorRecord = Awaited<ReturnType<typeof prisma.floor.findMany>>[number];
type UnitTypeRecord = Awaited<ReturnType<typeof prisma.unitType.findMany>>[number];
type UnitRecord = Awaited<ReturnType<typeof prisma.unit.findMany>>[number];

function serializeDate(value: Date) {
  return value.toISOString();
}

function serializeDecimal(value: unknown) {
  return value == null ? "" : String(value);
}

export async function GET() {
  const [properties, floors, unitTypes, units]: [PropertyRecord[], FloorRecord[], UnitTypeRecord[], UnitRecord[]] = await Promise.all([
    prisma.property.findMany({ orderBy: [{ createdAt: "asc" }] }),
    prisma.floor.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.unitType.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.unit.findMany({ orderBy: [{ createdAt: "asc" }] }),
  ]);

  return NextResponse.json({
    properties: properties.map((property) => ({
      ...property,
      createdAt: serializeDate(property.createdAt),
      updatedAt: serializeDate(property.updatedAt),
    })),
    floors: floors.map((floor) => ({
      ...floor,
      createdAt: serializeDate(floor.createdAt),
      updatedAt: serializeDate(floor.updatedAt),
    })),
    unitTypes: unitTypes.map((unitType) => ({
      ...unitType,
      defaultRent: serializeDecimal(unitType.defaultRent),
      defaultDeposit: serializeDecimal(unitType.defaultDeposit),
      createdAt: serializeDate(unitType.createdAt),
      updatedAt: serializeDate(unitType.updatedAt),
    })),
    units: units.map((unit) => ({
      ...unit,
      areaSqFt: serializeDecimal(unit.areaSqFt),
      rentAmount: serializeDecimal(unit.rentAmount),
      depositAmount: serializeDecimal(unit.depositAmount),
      createdAt: serializeDate(unit.createdAt),
      updatedAt: serializeDate(unit.updatedAt),
    })),
  });
}
