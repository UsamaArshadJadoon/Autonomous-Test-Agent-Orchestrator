import { loadProjectConfig, loadEnvironmentConfig, loadRBACConfig, resolveCredentials } from './dist/config/loader.js';
import { RBAC } from './dist/rbac/rbac.js';

console.log('=== Testing Config Loader ===\n');

try {
  const projectConfig = loadProjectConfig('PROJ');
  console.log('✓ Project config loaded:', projectConfig.project_key, projectConfig.project_name);
} catch (e) {
  console.error('✗ Failed to load project config:', e.message);
}

try {
  // Set dummy env vars for testing
  process.env.DB_HOST = 'test.db.example.com';
  process.env.DB_NAME = 'test_db';
  process.env.DB_USERNAME = 'testuser';
  process.env.DB_PASSWORD = 'testpass';
  
  const envConfig = loadEnvironmentConfig('PROJ', 'qa');
  console.log('✓ Environment config loaded:', envConfig.app_url);
  console.log('  - DB host resolved:', envConfig.database.host === 'test.db.example.com' ? '✓' : '✗');
} catch (e) {
  console.error('✗ Failed to load environment config:', e.message);
}

try {
  const rbacConfig = loadRBACConfig('PROJ');
  console.log('✓ RBAC config loaded with roles:', Object.keys(rbacConfig.roles).join(', '));
} catch (e) {
  console.error('✗ Failed to load RBAC config:', e.message);
}

console.log('\n=== Testing RBAC Class ===\n');

try {
  const rbac = new RBAC('PROJ');
  
  const johnRole = rbac.getRoleForUser('john@company.com');
  console.log(`✓ john@company.com role: ${johnRole}`);
  
  const janeRole = rbac.getRoleForUser('jane@company.com');
  console.log(`✓ jane@company.com role: ${janeRole}`);
  
  const unknownRole = rbac.getRoleForUser('unknown@company.com');
  console.log(`✓ unknown@company.com role: ${unknownRole} (should be null)`);
  
  // Test permissions
  console.log('\n--- Permission Checks ---');
  console.log(`✓ john can_run_tests: ${rbac.hasPermission('john@company.com', 'run_tests')}`);
  console.log(`✓ john can_manage_team: ${rbac.hasPermission('john@company.com', 'manage_team')}`);
  console.log(`✓ jane can_run_tests: ${rbac.hasPermission('jane@company.com', 'run_tests')}`);
  console.log(`✓ jane can_manage_team: ${rbac.hasPermission('jane@company.com', 'manage_team')}`);
  console.log(`✓ dev can_run_tests: ${rbac.hasPermission('dev@company.com', 'run_tests')}`);
  console.log(`✓ dev can_log_bugs: ${rbac.hasPermission('dev@company.com', 'log_bugs')}`);
  
  // Test checkPermissionOrThrow
  console.log('\n--- Permission Enforcement ---');
  try {
    rbac.checkPermissionOrThrow('jane@company.com', 'manage_team');
    console.log('✗ Should have thrown for jane managing team');
  } catch (e) {
    console.log('✓ Correctly threw error for jane managing team');
  }
  
} catch (e) {
  console.error('✗ RBAC test failed:', e.message);
}

