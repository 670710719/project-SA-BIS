export const evaluationYear = '2569';
export const performanceWeights = { goals: 70, competencies: 30 };

export const competencies = [
  { id: 'quality', label: 'คุณภาพและความถูกต้องของงาน' },
  { id: 'ownership', label: 'ความรับผิดชอบและการทำงานให้สำเร็จ' },
  { id: 'teamwork', label: 'การทำงานร่วมกับผู้อื่น' },
  { id: 'communication', label: 'การสื่อสารและการประสานงาน' },
  { id: 'improvement', label: 'การเรียนรู้และพัฒนาตนเอง' },
];

export const ratingDescriptions = [
  { score: 1, label: 'ต้องปรับปรุง', detail: 'ผลงานต่ำกว่าเป้าหมายอย่างมีนัยสำคัญ ต้องมีแผนปรับปรุงใกล้ชิด' },
  { score: 2, label: 'ต่ำกว่าความคาดหวัง', detail: 'ทำได้บางส่วน แต่ยังไม่สม่ำเสมอและต้องพัฒนาเพิ่มเติม' },
  { score: 3, label: 'เป็นไปตามความคาดหวัง', detail: 'บรรลุเป้าหมายและทำงานได้ตามมาตรฐานของตำแหน่ง' },
  { score: 4, label: 'สูงกว่าความคาดหวัง', detail: 'ทำได้เกินเป้าหมายอย่างต่อเนื่อง พร้อมยกตัวอย่างผลลัพธ์ได้' },
  { score: 5, label: 'โดดเด่น', detail: 'สร้างผลลัพธ์โดดเด่นและส่งผลเชิงบวกเกินขอบเขตงานอย่างชัดเจน' },
];

function numericScores(values) {
  return values.map(Number).filter((score) => Number.isFinite(score) && score >= 1 && score <= 5);
}

function average(values) {
  return values.length
    ? values.reduce((total, score) => total + score, 0) / values.length
    : null;
}

export function calculateAssessmentScore(assessment = {}) {
  const goalAverage = average(numericScores((assessment.goals || []).map(({ score }) => score)));
  const competencyAverage = average(numericScores(
    Object.values(assessment.ratings || {}).map(({ score }) => score),
  ));
  const overall = goalAverage !== null && competencyAverage !== null
    ? goalAverage * (performanceWeights.goals / 100)
      + competencyAverage * (performanceWeights.competencies / 100)
    : null;

  return {
    goals: goalAverage === null ? '-' : goalAverage.toFixed(2),
    competencies: competencyAverage === null ? '-' : competencyAverage.toFixed(2),
    overall: overall === null ? '-' : overall.toFixed(2),
  };
}

export function getAssessmentMissingFields(assessment = {}) {
  const missing = [];
  const goals = assessment.goals || [];

  if (goals.length === 0) missing.push('เพิ่มเป้าหมายการทำงานอย่างน้อย 1 รายการ');
  goals.forEach((goal, index) => {
    const number = index + 1;
    if (!goal.target?.trim()) missing.push(`ระบุเป้าหมายที่ ${number}`);
    if (!goal.result?.trim()) missing.push(`ระบุผลลัพธ์ของเป้าหมายที่ ${number}`);
    if (!goal.score) missing.push(`ให้คะแนนเป้าหมายที่ ${number}`);
    if (!goal.evidence?.trim()) missing.push(`เพิ่มหลักฐานประกอบเป้าหมายที่ ${number}`);
  });

  competencies.forEach(({ id, label }) => {
    if (!assessment.ratings?.[id]?.score) missing.push(`ให้คะแนน${label}`);
    if (!assessment.ratings?.[id]?.example?.trim()) missing.push(`เพิ่มตัวอย่างพฤติกรรม: ${label}`);
  });

  if (!assessment.strengths?.trim()) missing.push('สรุปจุดแข็งและความสำเร็จ');
  if (!assessment.improvements?.trim()) missing.push('ระบุสิ่งที่ต้องการพัฒนา');
  if (!assessment.nextGoals?.trim()) missing.push('ระบุเป้าหมายหรือการสนับสนุนรอบถัดไป');
  return missing;
}

export function getAssessmentCompletion(assessment = {}) {
  const missingCount = getAssessmentMissingFields(assessment).length;
  const total = Math.max(assessment.goals?.length || 0, 1) * 4 + competencies.length * 2 + 3;
  return Math.round(((total - missingCount) / total) * 100);
}
