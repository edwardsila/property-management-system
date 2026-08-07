import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const stale = await prisma.payment.findMany({
    where: { rentPortion: { equals: 0 }, allocation: "RENT" },
    select: { id: true, amount: true },
  });

  let updated = 0;

  for (const payment of stale) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { rentPortion: payment.amount },
    });

    updated += 1;
  }

  console.log(`Backfilled ${updated} payment(s) as rent.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
