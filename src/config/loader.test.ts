import { resolveCredentials, loadProjectConfig } from './loader';
import { RBAC } from '../rbac/rbac';

describe('Config Loader', () => {
  it('should load project config', () => {
    const config = loadProjectConfig('PROJ');
    expect(config.project_key).toBe('PROJ');
    expect(config.project_name).toBe('Main Project');
    expect(config.jira_instance).toBe('https://jira.company.com');
  });

  it('should resolve environment variables', () => {
    // Set test env var
    process.env.TEST_VAR = 'test_value';

    const config = { key: 'env:TEST_VAR' };
    const resolved = resolveCredentials(config);

    expect(resolved.key).toBe('test_value');
  });

  it('should throw on missing env variable', () => {
    const config = { key: 'env:NONEXISTENT_VAR_12345' };

    expect(() => resolveCredentials(config)).toThrow(
      'Environment variable not set: NONEXISTENT_VAR_12345'
    );
  });

  it('should resolve nested environment variables', () => {
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';

    const config = {
      database: {
        host: 'env:DB_HOST',
        port: 'env:DB_PORT',
      },
    };
    const resolved = resolveCredentials(config);

    expect(resolved.database.host).toBe('localhost');
    expect(resolved.database.port).toBe('5432');
  });
});

describe('RBAC', () => {
  it('should check user permissions', () => {
    const rbac = new RBAC('PROJ');

    // qa_lead should have all permissions
    expect(rbac.hasPermission('john@company.com', 'run_tests')).toBe(true);
    expect(rbac.hasPermission('john@company.com', 'approve_results')).toBe(true);
    expect(rbac.hasPermission('john@company.com', 'log_bugs')).toBe(true);

    // qa_tester should not have approve_results
    expect(rbac.hasPermission('jane@company.com', 'approve_results')).toBe(false);
    expect(rbac.hasPermission('jane@company.com', 'run_tests')).toBe(true);

    // developer has limited permissions
    expect(rbac.hasPermission('dev@company.com', 'run_tests')).toBe(true);
    expect(rbac.hasPermission('dev@company.com', 'log_bugs')).toBe(false);
  });

  it('should return null role for unknown user', () => {
    const rbac = new RBAC('PROJ');
    expect(rbac.getRoleForUser('unknown@company.com')).toBeNull();
  });
});
