export interface ProjectConfig {
  project_key: string;
  project_name: string;
  jira_instance: string;
  jira_credentials: string; // env:JIRA_TOKEN
  supported_environments: string[];
  max_concurrent_executions: number;
  webhook_endpoints: string[];
  teams?: {
    qa_lead?: string;
    qa_testers?: string[];
    developers?: string[];
  };
}

export interface EnvironmentConfig {
  app_url: string;
  database: {
    host: string;
    port: number;
    name: string;
    username: string;
    password: string; // env:PASSWORD
  };
  auth_type: string;
}

export interface RBACConfig {
  roles: {
    [roleName: string]: {
      can_run_tests: boolean;
      can_approve_results: boolean;
      can_log_bugs: boolean;
      can_manage_team: boolean;
    };
  };
  team_members: {
    [email: string]: string; // role
  };
}
