/**
 * Walammi seed script.
 * Creates the admin user, demo readers, two series with parts (pointing at the
 * bundled sample PDFs), comments, reactions and a week of analytics so the
 * dashboard has something to show on first run.
 *
 * Run:  npm run db:setup   (db push + seed)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BASE = process.env.SAMPLE_PDF_BASE || "http://localhost:3000";

async function main() {
  console.log("Seeding Walammi…");

  // ── Users ──
  const adminHash = await bcrypt.hash("admin1234", 12);
  const readerHash = await bcrypt.hash("reader1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@walammi.test" },
    update: { role: "ADMIN" },
    create: { name: "Walammi Admin", email: "admin@walammi.test", passwordHash: adminHash, role: "ADMIN" },
  });

  const readers = [];
  for (const [name, email] of [
    ["Mara Ellison", "mara@example.com"],
    ["Jonas Reyes", "jonas@example.com"],
    ["Priya Nair", "priya@example.com"],
    ["Tom Adler", "tom@example.com"],
  ]) {
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, passwordHash: readerHash },
    });
    readers.push(u);
  }

  // ── Series 1 ──
  const lighthouse = await prisma.series.upsert({
    where: { slug: "the-lighthouse-keepers-log" },
    update: {},
    create: {
      title: "The Lighthouse Keeper's Log",
      slug: "the-lighthouse-keepers-log",
      author: "A. N. Marlowe",
      genre: "Mystery",
      status: "ONGOING",
      featured: true,
      description:
        "When a forty-year-old lighthouse log arrives under her door, Mara Ellison leaves the mainland for an island that appears on no map — to settle a debt the sea has been keeping for her family.",
    },
  });

  const lighthouseParts = [
    { order: 1, title: "The Letter in the Storm", file: "lighthouse-part-1.pdf", summary: "A letter arrives with the storm, and Mara recognises handwriting she has never seen." },
    { order: 2, title: "The Ferry to Nowhere", file: "lighthouse-part-2.pdf", summary: "The ferryman asks no questions, which is exactly what frightens her." },
    { order: 3, title: "What the Island Keeps", file: "lighthouse-part-3.pdf", summary: "The island gives back what it took — at a price no one warned her about." },
  ];

  for (const p of lighthouseParts) {
    await prisma.part.upsert({
      where: { seriesId_order: { seriesId: lighthouse.id, order: p.order } },
      update: { title: p.title, pdfUrl: `${BASE}/samples/${p.file}` },
      create: {
        seriesId: lighthouse.id,
        order: p.order,
        title: p.title,
        pdfUrl: `${BASE}/samples/${p.file}`,
        summary: p.summary,
        published: true,
      },
    });
  }

  // ── Series 2 ──
  const proxima = await prisma.series.upsert({
    where: { slug: "signal-from-proxima" },
    update: {},
    create: {
      title: "Signal from Proxima",
      slug: "signal-from-proxima",
      author: "R. Okafor",
      genre: "Science Fiction",
      status: "ONGOING",
      description:
        "An interstellar signal repeats every 11.2 hours — too regular for nature, too patient for accident. A junior radio astronomer is the only one who notices it is counting down.",
    },
  });

  const proximaParts = [
    { order: 1, title: "A Whisper of Order", file: "proxima-part-1.pdf", summary: "The graveyard shift delivers a signal that should not exist, to an astronomer nobody listens to." },
    { order: 2, title: "The Interferometry Problem", file: "proxima-part-2.pdf", summary: "To prove the signal is real, Ada must borrow an array of dishes that belong to three rival governments." },
    { order: 3, title: "Answer, Whoever You Are", file: "proxima-part-3.pdf", summary: "The countdown reaches zero and the answer arrives — addressed to her by name." },
  ];

  for (const p of proximaParts) {
    await prisma.part.upsert({
      where: { seriesId_order: { seriesId: proxima.id, order: p.order } },
      update: { title: p.title, pdfUrl: `${BASE}/samples/${p.file}` },
      create: {
        seriesId: proxima.id,
        order: p.order,
        title: p.title,
        pdfUrl: `${BASE}/samples/${p.file}`,
        summary: p.summary,
        published: true,
      },
    });
  }

  const allParts = await prisma.part.findMany({ orderBy: { order: "asc" } });

  // ── Comments & reactions (skip if already seeded) ──
  const existingComments = await prisma.comment.count();
  if (existingComments === 0) {
    const commentSeeds = [
      { partOrder: 1, series: "lighthouse", user: 0, body: "The opening image of the letter slipping under the door like a knife — I felt that. Instantly hooked." },
      { partOrder: 1, series: "lighthouse", user: 1, body: "Read this in one sitting. The ferryman scenes are beautifully eerie.", replyTo: null },
      { partOrder: 1, series: "lighthouse", user: 2, body: "Agreed! Though I half-expected the log to be blank when she opened it." },
      { partOrder: 2, series: "lighthouse", user: 3, body: "Two hundred steps and she didn't look back once. Stone cold. I love her." },
      { partOrder: 1, series: "proxima", user: 1, body: "11.2 hours… that's suspiciously close to Proxima b's orbital period. Nice touch." },
      { partOrder: 1, series: "proxima", user: 0, body: "The countdown reveal at the end of part one gave me chills." },
      { partOrder: 2, series: "proxima", user: 2, body: "Three rival governments and one borrowed array — this is peak hard SF diplomacy drama." },
    ];
    for (const c of commentSeeds) {
      const part = allParts.find((p) => p.order === c.partOrder && p.seriesId === (c.series === "lighthouse" ? lighthouse.id : proxima.id));
      if (!part) continue;
      await prisma.comment.create({ data: { partId: part.id, userId: readers[c.user].id, body: c.body } });
    }

    const reactionSeeds = [
      [0, "LIKE"], [0, "LOVE"], [0, "FIRE"], [1, "LOVE"], [1, "WOW"],
      [2, "LIKE"], [2, "SAD"], [3, "FIRE"], [4, "WOW"], [4, "FIRE"], [5, "LOVE"],
    ];
    for (const [partIdx, kind] of reactionSeeds) {
      const part = allParts[partIdx];
      if (!part) continue;
      await prisma.reaction.create({
        data: { partId: part.id, userId: readers[(partIdx + reactionSeeds.length) % readers.length].id, kind },
      }).catch(() => {});
    }
  }

  // ── A week of fake traffic (skip if already present) ──
  const existingViews = await prisma.partView.count();
  if (existingViews < 10) {
    const dayWeights = [9, 12, 15, 11, 18, 22, 14];
    let created = 0;
    for (let d = 6; d >= 0; d--) {
      const count = dayWeights[6 - d];
      for (let i = 0; i < count; i++) {
        const part = allParts[i % allParts.length];
        const reader = readers[i % readers.length];
        const when = new Date();
        when.setDate(when.getDate() - d);
        when.setHours(8 + (i % 14), (i * 7) % 60, 0, 0);
        await prisma.partView.create({ data: { partId: part.id, userId: reader.id, sessionId: "seed", createdAt: when } });
        created++;
      }
      // some events for the activity feed
      const evWhen = new Date();
      evWhen.setDate(evWhen.getDate() - d);
      evWhen.setHours(9 + (d % 10), 0, 0, 0);
      await prisma.analyticsEvent.create({
        data: { type: "READ_START", partId: allParts[d % allParts.length].id, userId: readers[d % readers.length].id, createdAt: evWhen },
      }).catch(() => {});
    }
    // a couple of blocked download attempts, as any reader UI produces
    for (let i = 0; i < 3; i++) {
      const when = new Date();
      when.setHours(when.getHours() - i * 9);
      await prisma.analyticsEvent.create({
        data: { type: "DOWNLOAD_ATTEMPT", partId: allParts[i % allParts.length].id, userId: readers[i % readers.length].id, createdAt: when, meta: { notice: "Downloads and copying are disabled." } },
      }).catch(() => {});
    }
    console.log(`Created ${created} part views + events`);
  }

  console.log("Seed complete.");
  console.log("  Admin:    admin@walammi.test / admin1234");
  console.log("  Reader:   mara@example.com  / reader1234 (same password for all demo readers)");
  console.log(`  Sample PDFs expected at ${BASE}/samples/*.pdf — run "npm run dev" before seeding if you changed the base.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
