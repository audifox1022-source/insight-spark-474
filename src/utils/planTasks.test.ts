import { describe, expect, it } from 'vitest';
import {
  normalizePlanTask,
  normalizePlanTasks,
  planValueToText,
  repairPlanTasks,
  scorePlanTasks
} from './planTasks';

describe('plan task display normalization', () => {
  it('renders array and object deliverables as readable text', () => {
    const task = normalizePlanTask({
      phaseName: '업로드 문서 핵심 분석',
      deliverables: [
        { title: '핵심 수치 정리', evidence: '매출 25% 성장' },
        '청중별 메시지 구조화'
      ],
      priority: 'high'
    }, 0);

    expect(task.id).toBe('task-1');
    expect(task.title).toBe('업로드 문서 핵심 분석');
    expect(task.description).toContain('핵심 수치 정리');
    expect(task.description).toContain('매출 25% 성장');
    expect(task.description).toContain('청중별 메시지 구조화');
    expect(task.description).not.toContain('[object Object]');
    expect(task.impact).toBe('high');
  });

  it('supports outline-style AI plan keys', () => {
    const task = normalizePlanTask({
      slide_title: '시장 변화와 대응',
      key_points: ['시장 규모 확대', '고객 유지율 개선'],
      layout: 'comparison'
    }, 1);

    expect(task.title).toBe('시장 변화와 대응');
    expect(task.description).toContain('시장 규모 확대');
    expect(task.description).toContain('고객 유지율 개선');
    expect(task.impact).toBe('medium');
  });

  it('prefers task text over numeric step labels', () => {
    const task = normalizePlanTask({
      step: 1,
      task: '업로드 자료 기반 메시지 구조 설계',
      detail: '문서의 실제 수치와 근거를 각 슬라이드에 배치'
    }, 0);

    expect(task.title).toBe('업로드 자료 기반 메시지 구조 설계');
    expect(task.description).toContain('문서의 실제 수치와 근거');
  });

  it('normalizes mixed primitive tasks without blank content', () => {
    const tasks = normalizePlanTasks(['1분기 성과 요약']);

    expect(tasks[0]).toMatchObject({
      id: 'task-1',
      title: '1분기 성과 요약',
      description: '1분기 성과 요약',
      status: 'pending'
    });
  });

  it('converts nested plan values without leaking object stringification', () => {
    const text = planValueToText({
      steps: [
        { name: '자료 검증', detail: { source: 'uploaded.pdf', rule: 'source-first' } }
      ]
    });

    expect(text).toContain('자료 검증');
    expect(text).toContain('uploaded.pdf');
    expect(text).not.toContain('[object Object]');
  });

  it('A/B improves weak AI plan display against legacy shallow mapping', () => {
    const sourceText = [
      'Revenue grew 25% after enterprise expansion.',
      'Customer retention improved by 12 percentage points.',
      'Primary risk: onboarding cost increased 8%.'
    ].join('\n');
    const rawPlan = [{
      step: 1,
      task: 'Build executive narrative from uploaded metrics',
      deliverables: [
        { metric: 'Revenue grew 25%', implication: 'Lead with expansion proof' },
        { metric: 'Retention improved 12pp', implication: 'Add customer success slide' }
      ]
    }];

    const legacyTasks = rawPlan.map((task: any, index) => ({
      id: task.id || `task-${index + 1}`,
      title: task.title || task.phaseName || task.step || task.name || task.topic || `Task ${index + 1}`,
      description: task.description || task.detail || task.deliverables || task.summary || task.content || '',
      status: 'pending' as const,
      impact: 'medium' as const
    })).map((task) => ({
      ...task,
      title: String(task.title),
      description: typeof task.description === 'string' ? task.description : String(task.description)
    }));

    const candidateTasks = repairPlanTasks(rawPlan, sourceText, 5);
    const legacyScore = scorePlanTasks(legacyTasks, sourceText);
    const candidateScore = scorePlanTasks(candidateTasks, sourceText);

    expect(legacyTasks[0].description).toBe('[object Object],[object Object]');
    expect(candidateTasks[0].title).toBe('Build executive narrative from uploaded metrics');
    expect(candidateTasks[0].description).toContain('Revenue grew 25%');
    expect(candidateTasks[0].description).not.toContain('[object Object]');
    expect(candidateScore.score).toBeGreaterThan(legacyScore.score);
  });

  it('repairs empty plans from uploaded source signals', () => {
    const tasks = repairPlanTasks([], 'Market share: 18%\nRevenue: 40M KRW\nRisk: churn increase', 3);

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].title).toContain('Source');
    expect(tasks[0].description).toContain('Market share');
  });
});
