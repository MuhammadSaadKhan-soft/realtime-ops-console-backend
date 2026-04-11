// migrations/20240101000000-create-all-tables.js
// Creates all tables in the correct dependency order

"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── 1. Users ─────────────────────────────────────────────────────────────
    await queryInterface.createTable("users", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      avatar_url: { type: Sequelize.STRING },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ─── 2. Organizations ─────────────────────────────────────────────────────
    await queryInterface.createTable("organizations", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      slug: { type: Sequelize.STRING, allowNull: false, unique: true },
      description: { type: Sequelize.TEXT },
      logo_url: { type: Sequelize.STRING },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ─── 3. Org Members ───────────────────────────────────────────────────────
    await queryInterface.createTable("org_members", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      org_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      role: {
        type: Sequelize.ENUM("owner", "admin", "member", "viewer"),
        allowNull: false,
        defaultValue: "member",
      },
      joined_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex("org_members", ["org_id", "user_id"], { unique: true });

    // ─── 4. Invites ───────────────────────────────────────────────────────────
    await queryInterface.createTable("invites", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      org_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      invited_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      email: { type: Sequelize.STRING },
      token: { type: Sequelize.STRING, allowNull: false, unique: true },
      role: { type: Sequelize.ENUM("admin", "member", "viewer"), defaultValue: "member" },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      accepted_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ─── 5. Tickets ───────────────────────────────────────────────────────────
    await queryInterface.createTable("tickets", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      org_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT },
      status: {
        type: Sequelize.ENUM("open", "investigating", "mitigated", "resolved"),
        allowNull: false,
        defaultValue: "open",
      },
      severity: {
        type: Sequelize.ENUM("critical", "high", "medium", "low"),
        allowNull: false,
        defaultValue: "medium",
      },
      tags: { type: Sequelize.ARRAY(Sequelize.STRING), defaultValue: [] },
      assignee_id: {
        type: Sequelize.UUID,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
      },
      resolved_at: { type: Sequelize.DATE },
      search_vector: { type: "TSVECTOR" },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Indexes for ticket queries
    await queryInterface.addIndex("tickets", ["org_id"]);
    await queryInterface.addIndex("tickets", ["org_id", "status"]);
    await queryInterface.addIndex("tickets", ["org_id", "severity"]);
    await queryInterface.addIndex("tickets", ["assignee_id"]);
    await queryInterface.addIndex("tickets", ["created_at"]);

    // GIN index for full-text search
    await queryInterface.sequelize.query(
      `CREATE INDEX tickets_search_vector_idx ON tickets USING GIN(search_vector)`
    );

    // Trigger: automatically keep search_vector up to date on insert/update
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION tickets_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER tickets_search_vector_trigger
      BEFORE INSERT OR UPDATE ON tickets
      FOR EACH ROW EXECUTE FUNCTION tickets_search_vector_update();
    `);

    // ─── 6. Comments ──────────────────────────────────────────────────────────
    await queryInterface.createTable("comments", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      ticket_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "tickets", key: "id" },
        onDelete: "CASCADE",
      },
      org_id: { type: Sequelize.UUID, allowNull: false },
      author_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
      },
      content: { type: Sequelize.TEXT, allowNull: false },
      is_edited: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("comments", ["ticket_id"]);

    // ─── 7. Attachments ───────────────────────────────────────────────────────
    await queryInterface.createTable("attachments", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      ticket_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "tickets", key: "id" },
        onDelete: "CASCADE",
      },
      org_id: { type: Sequelize.UUID, allowNull: false },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
      },
      file_name: { type: Sequelize.STRING, allowNull: false },
      s3_key: { type: Sequelize.STRING, allowNull: false },
      mime_type: { type: Sequelize.STRING, allowNull: false },
      file_size: { type: Sequelize.INTEGER, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("attachments", ["ticket_id"]);

    // ─── 8. Audit Logs ────────────────────────────────────────────────────────
    await queryInterface.createTable("audit_logs", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      org_id: { type: Sequelize.UUID, allowNull: false },
      actor_id: { type: Sequelize.UUID },
      action: { type: Sequelize.STRING, allowNull: false },
      entity_type: { type: Sequelize.STRING, allowNull: false },
      entity_id: { type: Sequelize.UUID, allowNull: false },
      old_data: { type: Sequelize.JSONB },
      new_data: { type: Sequelize.JSONB },
      ip_address: { type: Sequelize.STRING },
      user_agent: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("audit_logs", ["org_id", "created_at"]);
    await queryInterface.addIndex("audit_logs", ["entity_type", "entity_id"]);
    await queryInterface.addIndex("audit_logs", ["actor_id"]);
  },

  async down(queryInterface) {
    // Drop in reverse order to respect FK constraints
    await queryInterface.dropTable("audit_logs");
    await queryInterface.dropTable("attachments");
    await queryInterface.dropTable("comments");
    await queryInterface.dropTable("tickets");
    await queryInterface.dropTable("invites");
    await queryInterface.dropTable("org_members");
    await queryInterface.dropTable("organizations");
    await queryInterface.dropTable("users");
  },
};
