import { supabase } from '@/integrations/supabase/client';
import type { AnalysisResult } from './analyze';

export interface ScanRecord {
  id: string;
  patient_id: string | null;
  created_at: string;
  grade: number;
  grade_name: string;
  confidence: number;
  recommendation: string;
  scan_time: string | null;
  image_url: string;
  user_id: string;
}

export async function saveScan(
  patientId: string,
  imageDataUrl: string,
  result: AnalysisResult,
): Promise<ScanRecord> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('retinal_analyses')
    .insert({
      patient_id: patientId.trim() || null,
      user_id: user.id,
      image_url: imageDataUrl,
      grade: result.grade,
      grade_name: result.gradeName,
      confidence: result.confidence,
      recommendation: result.recommendation,
      features: [],
      reasoning: null,
      scan_time: `${(result.processingTime / 1000).toFixed(1)}s`,
    })
    .select('id, patient_id, created_at, grade, grade_name, confidence, recommendation, scan_time, image_url, user_id')
    .single();

  if (error) throw error;
  return data as ScanRecord;
}

export interface GetScansOptions {
  limit?: number;
  grade?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  minConfidence?: number | null;
}

export async function getScans(options: GetScansOptions = {}): Promise<ScanRecord[]> {
  const { limit = 200, grade, dateFrom, dateTo, minConfidence } = options;

  let query = supabase
    .from('retinal_analyses')
    .select('id, patient_id, created_at, grade, grade_name, confidence, recommendation, scan_time, image_url, user_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (grade !== null && grade !== undefined) query = query.eq('grade', grade);
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo);
  if (minConfidence !== null && minConfidence !== undefined)
    query = query.gte('confidence', minConfidence);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ScanRecord[];
}

export async function deleteScan(id: string): Promise<void> {
  const { error } = await supabase.from('retinal_analyses').delete().eq('id', id);
  if (error) throw error;
}
