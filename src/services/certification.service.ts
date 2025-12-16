import { createUserClient } from '../lib/supabase';
import { NotFoundError, DatabaseError } from '../lib/errors';
import { mapSupabaseError } from '../lib/supabase-errors';
import type { CreateCertificationInput, UpdateCertificationInput } from '../schemas/certification.schema';

const MAX_CERTIFICATION_ENTRIES = 20;

/**
 * Certification Interface
 */
export interface Certification {
  id: string;
  job_seeker_id: string;
  certification: string;
  issuing_organization?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  credential_id?: string | null;
  created_at?: string;
}

/**
 * Certification Service
 */
export class CertificationService {
  /**
   * Get job seeker profile ID for a user
   */
  private static async getJobSeekerProfileId(
    userId: string,
    accessToken: string
  ): Promise<string> {
    const supabase = createUserClient(accessToken);

    const { data, error } = await supabase
      .from('job_seekers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Job seeker profile not found');
    }

    return data.id;
  }

  /**
   * Get all certifications for a job seeker
   */
  static async getByJobSeekerId(
    jobSeekerId: string,
    accessToken: string
  ): Promise<Certification[]> {
    const supabase = createUserClient(accessToken);

    const { data, error } = await supabase
      .from('job_seeker_certifications')
      .select('*')
      .eq('job_seeker_id', jobSeekerId)
      .order('issue_date', { ascending: false });

    if (error) {
      console.error('Error fetching certifications:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get certifications for current user
   */
  static async getForUser(
    userId: string,
    accessToken: string
  ): Promise<Certification[]> {
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);
    return this.getByJobSeekerId(jobSeekerId, accessToken);
  }

  /**
   * Create certification entry
   */
  static async create(
    userId: string,
    certificationData: CreateCertificationInput,
    accessToken: string
  ): Promise<Certification> {
    const supabase = createUserClient(accessToken);
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);

    // Check limit
    const existing = await this.getByJobSeekerId(jobSeekerId, accessToken);
    if (existing.length >= MAX_CERTIFICATION_ENTRIES) {
      throw new DatabaseError(`Maximum ${MAX_CERTIFICATION_ENTRIES} certifications allowed`);
    }

    const { data, error } = await supabase
      .from('job_seeker_certifications')
      .insert([{
        ...certificationData,
        job_seeker_id: jobSeekerId,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating certification:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    return data;
  }

  /**
   * Update certification entry
   */
  static async update(
    certificationId: string,
    certificationData: UpdateCertificationInput,
    accessToken: string
  ): Promise<Certification> {
    const supabase = createUserClient(accessToken);

    const { data, error } = await supabase
      .from('job_seeker_certifications')
      .update(certificationData)
      .eq('id', certificationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating certification:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    return data;
  }

  /**
   * Delete certification entry
   */
  static async delete(certificationId: string, accessToken: string): Promise<void> {
    const supabase = createUserClient(accessToken);

    const { error } = await supabase
      .from('job_seeker_certifications')
      .delete()
      .eq('id', certificationId);

    if (error) {
      console.error('Error deleting certification:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }
  }
}
