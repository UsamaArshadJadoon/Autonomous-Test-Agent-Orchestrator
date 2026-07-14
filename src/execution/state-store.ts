import fs from 'fs';
import path from 'path';
import { ExecutionState, ExecutionStateUpdate } from './state.js';
import { extractTimestamp } from './id-generator.js';

const stateDir = './.execution-states';

/**
 * StateStore manages persistent storage of execution states
 */
export class StateStore {
  constructor() {
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
  }

  /**
   * Saves an execution state to persistent storage
   */
  save(state: ExecutionState): void {
    const filePath = path.join(stateDir, `${state.execution_id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  }

  /**
   * Loads an execution state from persistent storage
   */
  load(executionId: string): ExecutionState | null {
    const filePath = path.join(stateDir, `${executionId}.json`);
    if (!fs.existsSync(filePath)) return null;

    const data = fs.readFileSync(filePath, 'utf-8');
    const state = JSON.parse(data) as ExecutionState;
    state.started_at = new Date(state.started_at);
    if (state.completed_at) state.completed_at = new Date(state.completed_at);
    state.errors = state.errors.map(e => ({
      ...e,
      timestamp: new Date(e.timestamp)
    }));
    return state;
  }

  /**
   * Updates an execution state with partial updates
   */
  update(executionId: string, updates: ExecutionStateUpdate): ExecutionState {
    const state = this.load(executionId);
    if (!state) throw new Error(`Execution state not found: ${executionId}`);

    if (updates.status !== undefined) state.status = updates.status;
    if (updates.tests_generated !== undefined) state.tests_generated = updates.tests_generated;
    if (updates.tests_passed !== undefined) state.tests_passed = updates.tests_passed;
    if (updates.tests_failed !== undefined) state.tests_failed = updates.tests_failed;
    if (updates.bugs_created !== undefined) state.bugs_created = updates.bugs_created;
    if (updates.approval_status !== undefined) state.approval_status = updates.approval_status;

    if (updates.error) {
      state.errors.push({
        timestamp: new Date(),
        message: updates.error.message,
        severity: updates.error.severity
      });
    }

    this.save(state);
    return state;
  }

  /**
   * Cleans up execution states older than the specified date
   */
  cleanup(olderThan: Date): number {
    let deleted = 0;
    const files = fs.readdirSync(stateDir);

    for (const file of files) {
      const executionId = file.replace('.json', '');
      try {
        const timestamp = extractTimestamp(executionId);
        if (timestamp < olderThan) {
          fs.unlinkSync(path.join(stateDir, file));
          deleted++;
        }
      } catch {
        // Invalid filename, skip
      }
    }

    return deleted;
  }

  /**
   * Lists all execution states
   */
  listAll(): ExecutionState[] {
    const files = fs.readdirSync(stateDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => this.load(f.replace('.json', '')))
      .filter((s): s is ExecutionState => s !== null);
  }
}

let globalStateStore: StateStore | null = null;

/**
 * Initializes the global state store instance
 */
export function initializeStateStore(): StateStore {
  globalStateStore = new StateStore();
  return globalStateStore;
}

/**
 * Gets the global state store instance, initializing if needed
 */
export function getStateStore(): StateStore {
  if (!globalStateStore) {
    globalStateStore = new StateStore();
  }
  return globalStateStore;
}

/**
 * Gets execution state by ID
 */
export function getExecutionState(executionId: string): ExecutionState | null {
  return getStateStore().load(executionId);
}
