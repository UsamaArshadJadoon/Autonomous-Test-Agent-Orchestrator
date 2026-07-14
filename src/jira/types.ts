export interface Story {
  key: string;
  summary: string;
  description: string;
  acceptance_criteria: string[];
}

export interface Bug {
  title: string;
  description: string;
  environment: string;
  test_id: string;
  reproduction_steps: string[];
}
