-- Additive only. Does not ALTER/DROP existing RAG tables.

CREATE TABLE IF NOT EXISTS revenue_projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_stakeholders (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES revenue_projects(id),
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(80),
    share_bps INTEGER NOT NULL CHECK (share_bps >= 0 AND share_bps <= 10000),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS split_rules (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES revenue_projects(id),
    name VARCHAR(255) NOT NULL DEFAULT 'default',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS split_rule_items (
    id SERIAL PRIMARY KEY,
    split_rule_id INTEGER NOT NULL REFERENCES split_rules(id),
    stakeholder_id INTEGER NOT NULL REFERENCES project_stakeholders(id),
    share_bps INTEGER NOT NULL CHECK (share_bps >= 0 AND share_bps <= 10000)
);

CREATE TABLE IF NOT EXISTS transaction_split_audits (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES revenue_projects(id),
    split_rule_id INTEGER REFERENCES split_rules(id),
    reference VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(8) NOT NULL,
    allocations JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payout_requests (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES revenue_projects(id),
    stakeholder_id INTEGER NOT NULL REFERENCES project_stakeholders(id),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(8) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
