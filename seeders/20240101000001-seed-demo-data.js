"use strict";
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const STATUSES = ["open", "investigating", "mitigated", "resolved"];
const SEVERITIES = ["critical", "high", "medium", "low"];
const TAG_POOL = ["infra", "database", "api", "frontend", "auth", "billing", "performance", "security", "networking", "storage"];
const TITLES = [
  "High CPU usage on production servers",
  "Database connection pool exhausted",
  "API response times degraded",
  "Login service returning 503 errors",
  "Payment gateway timeout",
  "Memory leak detected in worker service",
  "SSL certificate expiring soon",
  "Disk space critical on log server",
  "Cache invalidation not working",
  "WebSocket connections dropping",
  "Search indexing falling behind",
  "Email delivery failures",
  "CDN cache stale in APAC region",
  "Batch job stuck in processing",
  "Rate limiting too aggressive",
  "Alert fatigue from noisy monitor",
  "Deployment rollback needed",
  "Third-party dependency outage",
  "User session expiring prematurely",
  "Backup job failed silently",
];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomTags = () => TAG_POOL.filter(() => Math.random() < 0.3);

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const sixMonthsAgo = new Date(now - 180 * 24 * 60 * 60 * 1000);
    const passwordHash = await bcrypt.hash("Password123!", 12);
    const users = [
      { id: uuidv4(), name: "Alice Owner", email: "alice@demo.com", password: passwordHash, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), name: "Bob Admin", email: "bob@demo.com", password: passwordHash, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), name: "Carol Member", email: "carol@demo.com", password: passwordHash, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), name: "Dave Viewer", email: "dave@demo.com", password: passwordHash, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), name: "Eve Engineer", email: "eve@demo.com", password: passwordHash, is_active: true, created_at: now, updated_at: now },
    ];
    await queryInterface.bulkInsert("users", users);
    const orgs = [
      { id: uuidv4(), name: "Acme Corp", slug: "acme-corp", description: "Main org for demo", owner_id: users[0].id, created_at: now, updated_at: now },
      { id: uuidv4(), name: "Beta Labs", slug: "beta-labs", description: "Second org for demo", owner_id: users[1].id, created_at: now, updated_at: now },
    ];
    await queryInterface.bulkInsert("organizations", orgs);
    const members = [
      { id: uuidv4(), org_id: orgs[0].id, user_id: users[0].id, role: "owner", joined_at: now },
      { id: uuidv4(), org_id: orgs[0].id, user_id: users[1].id, role: "admin", joined_at: now },
      { id: uuidv4(), org_id: orgs[0].id, user_id: users[2].id, role: "member", joined_at: now },
      { id: uuidv4(), org_id: orgs[0].id, user_id: users[3].id, role: "viewer", joined_at: now },
      { id: uuidv4(), org_id: orgs[0].id, user_id: users[4].id, role: "member", joined_at: now },
      { id: uuidv4(), org_id: orgs[1].id, user_id: users[1].id, role: "owner", joined_at: now },
      { id: uuidv4(), org_id: orgs[1].id, user_id: users[2].id, role: "member", joined_at: now },
    ];
    await queryInterface.bulkInsert("org_members", members);
    const BATCH_SIZE = 500;
    const TOTAL_TICKETS = 10000;
    const memberUserIds = users.map((u) => u.id);
    const ticketIds = [];
    for (let batch = 0; batch < TOTAL_TICKETS / BATCH_SIZE; batch++) {
      const tickets = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        const titleBase = randomItem(TITLES);
        const createdAt = randomDate(sixMonthsAgo, now);
        const orgId = Math.random() < 0.8 ? orgs[0].id : orgs[1].id;
        const id = uuidv4();
        ticketIds.push({ id, org_id: orgId });
        tickets.push({
          id,
          org_id: orgId,
          title: `${titleBase} #${batch * BATCH_SIZE + i + 1}`,
          description: `This ticket was auto-generated for load testing. Batch ${batch}, item ${i}. Investigate and resolve promptly.`,
          status: randomItem(STATUSES),
          severity: randomItem(SEVERITIES),
          tags: `{${randomTags().join(",")}}`, // Postgres array literal
          assignee_id: Math.random() < 0.7 ? randomItem(memberUserIds) : null,
          created_by: randomItem(memberUserIds),
          resolved_at: null,
          search_vector: null, // populated by DB trigger on insert
          created_at: createdAt,
          updated_at: createdAt,
        });
      }
      await queryInterface.bulkInsert("tickets", tickets);
      console.log(`  Seeded tickets ${batch * BATCH_SIZE + 1}–${(batch + 1) * BATCH_SIZE}`);
    }
    const sampleTickets = ticketIds.slice(0, 200);
    const comments = [];
    for (const { id: ticketId, org_id } of sampleTickets) {
      for (let c = 0; c < 3; c++) {
        comments.push({
          id: uuidv4(),
          ticket_id: ticketId,
          org_id,
          author_id: randomItem(memberUserIds),
          content: randomItem([
            "Investigating the root cause now.",
            "This appears to be related to the recent deployment.",
            "Escalating to the infra team.",
            "Mitigation in place, monitoring closely.",
            "Issue resolved — root cause was a misconfigured env variable.",
            "Rolled back the change. Services recovering.",
            "Added runbook for future reference.",
          ]),
          is_edited: false,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
    await queryInterface.bulkInsert("comments", comments);
    console.log("✅ Seed complete:");
    console.log(`   ${users.length} users`);
    console.log(`   ${orgs.length} organizations`);
    console.log(`   ${TOTAL_TICKETS} tickets`);
    console.log(`   ${comments.length} comments`);
    console.log("\n   Demo login: alice@demo.com / Password123!");
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("audit_logs", null, {});
    await queryInterface.bulkDelete("comments", null, {});
    await queryInterface.bulkDelete("attachments", null, {});
    await queryInterface.bulkDelete("tickets", null, {});
    await queryInterface.bulkDelete("invites", null, {});
    await queryInterface.bulkDelete("org_members", null, {});
    await queryInterface.bulkDelete("organizations", null, {});
    await queryInterface.bulkDelete("users", null, {});
  },
};
