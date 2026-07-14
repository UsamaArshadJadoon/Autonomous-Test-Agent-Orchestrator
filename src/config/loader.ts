import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ProjectConfig, EnvironmentConfig, RBACConfig } from '../types/config.js';

dotenv.config();

export function loadProjectConfig(projectKey: string): ProjectConfig {
  const configPath = path.join(
    process.cwd(),
    '.testconfig',
    'projects',
    projectKey,
    'project.json'
  );

  if (!fs.existsSync(configPath)) {
    throw new Error(`Project config not found: ${configPath}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config as ProjectConfig;
}

export function loadEnvironmentConfig(
  projectKey: string,
  environment: string
): EnvironmentConfig {
  const configPath = path.join(
    process.cwd(),
    '.testconfig',
    'projects',
    projectKey,
    'environments.json'
  );

  if (!fs.existsSync(configPath)) {
    throw new Error(`Environments config not found: ${configPath}`);
  }

  const allEnvs = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const envConfig = allEnvs[environment];

  if (!envConfig) {
    throw new Error(`Environment not configured: ${environment}`);
  }

  return resolveCredentials(envConfig) as EnvironmentConfig;
}

export function loadRBACConfig(projectKey: string): RBACConfig {
  const configPath = path.join(
    process.cwd(),
    '.testconfig',
    'projects',
    projectKey,
    'rbac.json'
  );

  if (!fs.existsSync(configPath)) {
    throw new Error(`RBAC config not found: ${configPath}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config as RBACConfig;
}

export function resolveCredentials(config: any): any {
  // Replace env:VAR_NAME with actual env variable
  const resolved = JSON.parse(JSON.stringify(config));

  function replaceEnvVars(obj: any): any {
    if (typeof obj === 'string' && obj.startsWith('env:')) {
      const varName = obj.substring(4);
      const value = process.env[varName];
      if (!value) {
        throw new Error(`Environment variable not set: ${varName}`);
      }
      return value;
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = replaceEnvVars(obj[key]);
      }
    }
    return obj;
  }

  return replaceEnvVars(resolved);
}
