/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test';
import { getRoleAffinity } from './role-affinity';

describe('getRoleAffinity', () => {
  // Planner/Architect: communicators are ideal
  test('planner strongly prefers communicators', () => {
    expect(getRoleAffinity('planner', 'claude-communicator')).toBeGreaterThan(
      getRoleAffinity('planner', 'gpt-codex'),
    );
    expect(getRoleAffinity('planner', 'claude-communicator')).toBeGreaterThan(
      getRoleAffinity('planner', 'speed-runner'),
    );
  });

  // Engineer: codex is ideal
  test('engineer strongly prefers codex', () => {
    expect(getRoleAffinity('engineer', 'gpt-codex')).toBeGreaterThan(
      getRoleAffinity('engineer', 'speed-runner'),
    );
    expect(getRoleAffinity('engineer', 'gpt-codex')).toBeGreaterThan(
      getRoleAffinity('engineer', 'all-rounder'),
    );
  });

  // Oracle: reasoning is ideal
  test('oracle strongly prefers reasoning models', () => {
    expect(getRoleAffinity('oracle', 'gpt-reasoning')).toBeGreaterThan(
      getRoleAffinity('oracle', 'speed-runner'),
    );
    expect(getRoleAffinity('oracle', 'gemini-pro')).toBeGreaterThan(
      getRoleAffinity('oracle', 'speed-runner'),
    );
  });

  // Designer: gemini-pro is ideal
  test('designer strongly prefers gemini-pro', () => {
    expect(getRoleAffinity('designer', 'gemini-pro')).toBeGreaterThan(
      getRoleAffinity('designer', 'gpt-codex'),
    );
    expect(getRoleAffinity('designer', 'gemini-pro')).toBeGreaterThan(
      getRoleAffinity('designer', 'speed-runner'),
    );
  });

  // Explorer: speed-runner is ideal
  test('explorer strongly prefers speed-runners', () => {
    expect(getRoleAffinity('explorer', 'speed-runner')).toBeGreaterThan(
      getRoleAffinity('explorer', 'claude-communicator'),
    );
    expect(getRoleAffinity('explorer', 'speed-runner')).toBeGreaterThan(
      getRoleAffinity('explorer', 'gpt-codex'),
    );
  });

  // Explorer: communicators are anti-pattern
  test('explorer penalizes expensive communicators', () => {
    expect(getRoleAffinity('explorer', 'claude-communicator')).toBeLessThan(0);
  });

  // Librarian: speed over intelligence
  test('librarian prefers speed-runners and all-rounders', () => {
    expect(getRoleAffinity('librarian', 'speed-runner')).toBeGreaterThan(
      getRoleAffinity('librarian', 'claude-communicator'),
    );
  });

  // Quick: speed + coding balance
  test('quick prefers speed-runners', () => {
    expect(getRoleAffinity('quick', 'speed-runner')).toBeGreaterThan(
      getRoleAffinity('quick', 'claude-communicator'),
    );
  });

  // Deep: maximum capability
  test('deep prefers codex and communicators', () => {
    expect(getRoleAffinity('deep', 'gpt-codex')).toBeGreaterThan(
      getRoleAffinity('deep', 'speed-runner'),
    );
    expect(getRoleAffinity('deep', 'claude-communicator')).toBeGreaterThan(
      getRoleAffinity('deep', 'speed-runner'),
    );
  });
});
