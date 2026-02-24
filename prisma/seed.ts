import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing orders (optional)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  // Create 20 sample orders with references H-001 to H-020
  for (let i = 1; i <= 20; i++) {
    const refNumber = String(i).padStart(3, "0");
    const reference = `H-${refNumber}`;
    const orderNumber = `CMD-${Date.now()}-${i}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: `Client ${i}`,
        customerEmail: `client${i}@example.com`,
        customerPhone: `06${String(Math.random() * 100000000).padStart(8, "0")}`,
        status: "COMMANDE_A_TRAITER",
        paymentStatus: i % 2 === 0 ? "PAID" : "PENDING",
        total: 35 + i * 5,
        subtotal: 30 + i * 5,
        shipping: 5,
        tax: 0,
        currency: "EUR",
        category: "t-shirt",
        notes: `Commande test ${i} - Référence: ${reference}`,
        shippingAddress: {
          reference,
          logoAvant: `LOGO-${refNumber}-AV`,
          logoArriere: `LOGO-${refNumber}-AR`,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          coteLogoAr: "A4",
          _source: "olda_studio",
        },
        items: {
          create: [
            {
              name: "T-Shirt Avant",
              sku: reference,
              quantity: 1,
              price: 25,
              imageUrl: null,
            },
            {
              name: "T-Shirt Arrière",
              sku: reference,
              quantity: 1,
              price: 10,
              imageUrl: null,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    console.log(`✅ Produit inséré : ${reference} (Commande: ${orderNumber})`);
  }

  console.log("🎉 Seeding terminé!");
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
