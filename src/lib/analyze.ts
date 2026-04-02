import imageCompression from 'browser-image-compression';

// Trained on APTOS 2019 Blindness Detection + EyePACS
// 5-class DR classification head, most downloads in this category on HuggingFace
const HF_MODEL = 'nickmuchi/vit-base-patch16-224-retinopathy-grade';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

export type DRGrade = 0 | 1 | 2 | 3 | 4;
export type DRGradeName = 'No DR' | 'Mild' | 'Moderate' | 'Severe' | 'Proliferative';

export interface AnalysisResult {
  grade: DRGrade;
  gradeName: DRGradeName;
  confidence: number;
  processingTime: number;
  rawScores: Record<string, number>;
  recommendation: string;
}

const GRADE_MAP: Record<string, DRGrade> = {
  No_DR: 0, no_dr: 0, '0': 0, 'No DR': 0,
  Mild: 1, mild: 1, '1': 1,
  Moderate: 2, moderate: 2, '2': 2,
  Severe: 3, severe: 3, '3': 3,
  Proliferative_DR: 4, proliferative_dr: 4, Proliferative: 4, '4': 4,
};

const GRADE_NAMES: Record<DRGrade, DRGradeName> = {
  0: 'No DR',
  1: 'Mild',
  2: 'Moderate',
  3: 'Severe',
  4: 'Proliferative',
};

const RECOMMENDATIONS: Record<DRGrade, string> = {
  0: 'No diabetic retinopathy detected. Continue annual screening as per guidelines.',
  1: 'Mild NPDR detected. Follow-up recommended in 6–12 months.',
  2: 'Moderate NPDR detected. Ophthalmology referral recommended within 3–6 months.',
  3: 'Severe NPDR detected. Urgent ophthalmology referral required within 1 month.',
  4: 'Proliferative DR detected. IMMEDIATE ophthalmology referral — high risk of vision loss.',
};

export async function analyzeRetinalImage(file: File): Promise<AnalysisResult> {
  const start = Date.now();

  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    fileType: 'image/jpeg',
  });

  const buffer = await compressed.arrayBuffer();

  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_HF_API_KEY}`,
      'Content-Type': 'application/octet-stream',
    },
    body: buffer,
  });

  if (response.status === 503) {
    throw new Error('Model is loading — please retry in ~20 seconds.');
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HuggingFace API error ${response.status}: ${body.slice(0, 120)}`);
  }

  const scores: { label: string; score: number }[] = await response.json();

  if (!Array.isArray(scores) || scores.length === 0) {
    throw new Error('Unexpected response from classification model.');
  }

  const top = scores.reduce((a, b) => (a.score > b.score ? a : b));
  const grade: DRGrade = GRADE_MAP[top.label] ?? 0;

  const rawScores: Record<string, number> = {};
  for (const s of scores) {
    rawScores[s.label] = s.score;
  }

  return {
    grade,
    gradeName: GRADE_NAMES[grade],
    confidence: Math.round(top.score * 100),
    processingTime: Date.now() - start,
    rawScores,
    recommendation: RECOMMENDATIONS[grade],
  };
}
