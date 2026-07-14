import { StateStore, getExecutionState } from '../../src/execution/state-store';
import { ExecutionState, ExecutionStatus } from '../../src/execution/state';
import { generateExecutionId } from '../../src/execution/id-generator';
import fs from 'fs';
import path from 'path';

// Clean up test state directory before and after tests
const stateDir = './.execution-states';

describe('StateStore', () => {
  let store: StateStore;

  beforeEach(() => {
    store = new StateStore();
  });

  afterEach(() => {
    // Clean up test state files
    if (fs.existsSync(stateDir)) {
      const files = fs.readdirSync(stateDir);
      for (const file of files) {
        fs.unlinkSync(path.join(stateDir, file));
      }
    }
  });

  it('should save and load execution state', () => {
    const state: ExecutionState = {
      execution_id: generateExecutionId(),
      story_key: 'PROJ-123',
      environment: 'qa',
      mode: 'full',
      status: ExecutionStatus.PENDING,
      tests_generated: 0,
      tests_passed: 0,
      tests_failed: 0,
      bugs_created: [],
      approval_status: 'pending',
      started_at: new Date(),
      errors: []
    };

    store.save(state);
    const loaded = store.load(state.execution_id);

    expect(loaded).not.toBeNull();
    expect(loaded?.execution_id).toBe(state.execution_id);
    expect(loaded?.story_key).toBe('PROJ-123');
    expect(loaded?.status).toBe(ExecutionStatus.PENDING);
  });

  it('should return null for non-existent execution state', () => {
    const loaded = store.load('exec_99999999_nonexistent');
    expect(loaded).toBeNull();
  });

  it('should update execution state', () => {
    const id = generateExecutionId();
    const state: ExecutionState = {
      execution_id: id,
      story_key: 'PROJ-123',
      environment: 'qa',
      mode: 'full',
      status: ExecutionStatus.PENDING,
      tests_generated: 0,
      tests_passed: 0,
      tests_failed: 0,
      bugs_created: [],
      approval_status: 'pending',
      started_at: new Date(),
      errors: []
    };

    store.save(state);
    const updated = store.update(id, {
      status: ExecutionStatus.COMPLETED,
      tests_generated: 50,
      tests_passed: 48
    });

    expect(updated.status).toBe(ExecutionStatus.COMPLETED);
    expect(updated.tests_generated).toBe(50);
    expect(updated.tests_passed).toBe(48);

    // Verify persistence
    const reloaded = store.load(id);
    expect(reloaded?.status).toBe(ExecutionStatus.COMPLETED);
  });

  it('should add error to state', () => {
    const id = generateExecutionId();
    const state: ExecutionState = {
      execution_id: id,
      story_key: 'PROJ-123',
      environment: 'qa',
      mode: 'full',
      status: ExecutionStatus.PENDING,
      tests_generated: 0,
      tests_passed: 0,
      tests_failed: 0,
      bugs_created: [],
      approval_status: 'pending',
      started_at: new Date(),
      errors: []
    };

    store.save(state);
    const updated = store.update(id, {
      error: { message: 'Test error', severity: 'error' }
    });

    expect(updated.errors).toHaveLength(1);
    expect(updated.errors[0].message).toBe('Test error');
    expect(updated.errors[0].severity).toBe('error');
  });

  it('should throw on update for non-existent state', () => {
    expect(() => {
      store.update('exec_99999999_nonexistent', { status: ExecutionStatus.COMPLETED });
    }).toThrow('Execution state not found');
  });

  it('should list all states', () => {
    const state1: ExecutionState = {
      execution_id: generateExecutionId(),
      story_key: 'PROJ-1',
      environment: 'qa',
      mode: 'full',
      status: ExecutionStatus.PENDING,
      tests_generated: 0,
      tests_passed: 0,
      tests_failed: 0,
      bugs_created: [],
      approval_status: 'pending',
      started_at: new Date(),
      errors: []
    };

    const state2: ExecutionState = {
      execution_id: generateExecutionId(),
      story_key: 'PROJ-2',
      environment: 'prod',
      mode: 'smoke',
      status: ExecutionStatus.PENDING,
      tests_generated: 0,
      tests_passed: 0,
      tests_failed: 0,
      bugs_created: [],
      approval_status: 'pending',
      started_at: new Date(),
      errors: []
    };

    store.save(state1);
    store.save(state2);
    const all = store.listAll();

    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.some(s => s.story_key === 'PROJ-1')).toBe(true);
    expect(all.some(s => s.story_key === 'PROJ-2')).toBe(true);
  });

  it('should cleanup old execution states', () => {
    const state: ExecutionState = {
      execution_id: 'exec_20200101_aaaaaaaa',
      story_key: 'PROJ-OLD',
      environment: 'qa',
      mode: 'full',
      status: ExecutionStatus.COMPLETED,
      tests_generated: 10,
      tests_passed: 10,
      tests_failed: 0,
      bugs_created: [],
      approval_status: 'approved',
      started_at: new Date('2020-01-01'),
      errors: []
    };

    store.save(state);
    const cutoffDate = new Date('2021-01-01');
    const deleted = store.cleanup(cutoffDate);

    expect(deleted).toBeGreaterThan(0);
    const loaded = store.load('exec_20200101_aaaaaaaa');
    expect(loaded).toBeNull();
  });

  it('should preserve dates when loading state', () => {
    const now = new Date();
    const id = generateExecutionId();
    const state: ExecutionState = {
      execution_id: id,
      story_key: 'PROJ-123',
      environment: 'qa',
      mode: 'full',
      status: ExecutionStatus.PENDING,
      tests_generated: 0,
      tests_passed: 0,
      tests_failed: 0,
      bugs_created: [],
      approval_status: 'pending',
      started_at: now,
      completed_at: new Date(now.getTime() + 1000),
      errors: []
    };

    store.save(state);
    const loaded = store.load(id);

    expect(loaded?.started_at).toEqual(now);
    expect(loaded?.completed_at).toEqual(state.completed_at);
  });

  it('should get execution state via helper function', () => {
    const id = generateExecutionId();
    const state: ExecutionState = {
      execution_id: id,
      story_key: 'PROJ-123',
      environment: 'qa',
      mode: 'full',
      status: ExecutionStatus.PENDING,
      tests_generated: 0,
      tests_passed: 0,
      tests_failed: 0,
      bugs_created: [],
      approval_status: 'pending',
      started_at: new Date(),
      errors: []
    };

    store.save(state);
    const retrieved = getExecutionState(id);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.story_key).toBe('PROJ-123');
  });
});
