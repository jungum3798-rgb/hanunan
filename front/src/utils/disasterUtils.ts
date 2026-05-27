export const DISASTER_TYPE_UI: Record<string, { icon: string; label: string; color: string }> = {
  화재: { icon: '🔥', label: '화재', color: '#FF4B4B' },
  산불: { icon: '🔥', label: '산불', color: '#FF5722' },
  테러: { icon: '🚨', label: '테러', color: '#9C27B0' },
  붕괴: { icon: '🏚️', label: '붕괴', color: '#795548' },
  폭발: { icon: '💥', label: '폭발', color: '#FF5722' },
  산사태: { icon: '⛰️', label: '산사태', color: '#6D4C41' },
};

export const getDisasterTypeUi = (type: string) =>
  DISASTER_TYPE_UI[type] ?? { icon: '⚠️', label: type || '재난', color: '#FF4B4B' };

export const getPipelineStageLabel = (stage: string) =>
  stage === 'active' ? '진행중' :
  stage === 'cooling' ? '수습중' : '종료추정';

export const getPipelineStageSuffix = (stage: string) =>
  ` · ${getPipelineStageLabel(stage)}`;

export const formatPipelineBadge = (disasterType: string, stage: string) => {
  const ui = getDisasterTypeUi(disasterType);
  return `${ui.icon} ${ui.label}${getPipelineStageSuffix(stage)}`;
};
