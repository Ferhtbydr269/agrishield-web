/**
 *   npm run seed   → parseller, poliçeler, 2025–26 sezon verisi, örnek kararlar (7F3A…)
 */
import { seedDatabase } from "../src/server/seed-core";
import { db } from "../src/server/db";

seedDatabase((m) => console.log(`  ${m}`))
  .then(async (r) => {
    console.log(`Seed tamam. Kanıt sayfaları: ${r.decisions.join(" · ")}`);
    console.log("Örnek: http://localhost:3000/k/7F3A");
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
