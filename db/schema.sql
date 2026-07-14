-- db/schema.sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100),
  password_hash VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2),
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(255),
  action VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id INT,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_execution_id ON audit_log(execution_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS execution_results (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(255) NOT NULL UNIQUE,
  project_key VARCHAR(50),
  story_key VARCHAR(50),
  environment VARCHAR(50),
  status VARCHAR(50),
  total_tests INT,
  passed_tests INT,
  failed_tests INT,
  coverage DECIMAL(5, 2),
  duration_seconds INT,
  runner VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_execution_results_execution_id ON execution_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_results_story_key ON execution_results(story_key);
CREATE INDEX IF NOT EXISTS idx_execution_results_created_at ON execution_results(created_at);

-- Sample data
INSERT INTO users (email, username, password_hash, name, role, status) VALUES
  ('test_admin@app.com', 'admin_user', 'hashed_password', 'Admin User', 'admin', 'active'),
  ('test_user@app.com', 'regular_user', 'hashed_password', 'Regular User', 'user', 'active')
  ON CONFLICT (email) DO NOTHING;

INSERT INTO accounts (user_id, account_name, account_type, status) VALUES
  (1, 'Admin Account', 'enterprise', 'active'),
  (2, 'User Account', 'free', 'active')
  ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, description, status) VALUES
  ('Test Product 1', 99.99, 'First test product', 'active'),
  ('Test Product 2', 199.99, 'Second test product', 'active')
  ON CONFLICT DO NOTHING;
