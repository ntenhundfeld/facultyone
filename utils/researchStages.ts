import { ResearchProject } from '../types';

export const DEFAULT_RESEARCH_STAGES = ['Inception', 'Grant', 'IRB', 'Data Collection', 'Analysis', 'Writing', 'Submission', 'Published'] as const;

const uniqueNonEmptyStages = (stages: string[]) =>
  stages.reduce<string[]>((accumulator, stage) => {
    const trimmed = stage.trim();
    if (!trimmed || accumulator.includes(trimmed)) {
      return accumulator;
    }

    accumulator.push(trimmed);
    return accumulator;
  }, []);

export const normalizeResearchStages = (candidate: unknown, projects: ResearchProject[] = []) => {
  const rawStages = Array.isArray(candidate) ? candidate.filter((stage): stage is string => typeof stage === 'string') : [...DEFAULT_RESEARCH_STAGES];
  const normalized = uniqueNonEmptyStages(rawStages.length > 0 ? rawStages : [...DEFAULT_RESEARCH_STAGES]);

  const projectStages = uniqueNonEmptyStages(projects.map(project => project.stage));
  projectStages.forEach(stage => {
    if (!normalized.includes(stage)) {
      normalized.push(stage);
    }
  });

  if (normalized.length === 0) {
    return [...DEFAULT_RESEARCH_STAGES];
  }

  return normalized;
};

export const getTerminalResearchStage = (researchStages: string[]) => {
  if (researchStages.includes('Published')) {
    return 'Published';
  }

  return researchStages[researchStages.length - 1] ?? DEFAULT_RESEARCH_STAGES[DEFAULT_RESEARCH_STAGES.length - 1];
};
