import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

function normalize(value) {
  return (value ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12);
}

async function main() {
  const units = await prisma.unit.findMany({
    where: { paymentAccountRef: null },
    select: { id: true, unitName: true, unitCode: true },
  });

  let updated = 0;

  for (const unit of units) {
    const ref = normalize(unit.unitCode) || normalize(unit.unitName) || "RENT";

    await prisma.unit.update({
      where: { id: unit.id },
      data: { paymentAccountRef: ref },
    });

    updated += 1;
  }

  console.log(`Backfilled paymentAccountRef for ${updated} unit(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
