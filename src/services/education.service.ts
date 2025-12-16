import { createUserClient } from '../lib/supabase';
import { NotFoundError, DatabaseError } from '../lib/errors';
import { mapSupabaseError } from '../lib/supabase-errors';
import type { CreateEducationInput, UpdateEducationInput } from '../schemas/education.schema';

const MAX_EDUCATION_ENTRIES = 10;

/**
 * Education Interface
 */
export interface Education {
  id: string;
  job_seeker_id: string;
  degree: string;
  school: string;
  year: string;
  honors?: string | null;
  created_at?: string;
}

/**
 * Education Service
 */
export class EducationService {
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
   * Get all education entries for a job seeker
   */
  static async getByJobSeekerId(
    jobSeekerId: string,
    accessToken: string
  ): Promise<Education[]> {
    const supabase = createUserClient(accessToken);

    const { data, error } = await supabase
      .from('job_seeker_education')
      .select('*')
      .eq('job_seeker_id', jobSeekerId)
      .order('year', { ascending: false });

    if (error) {
      console.error('Error fetching education:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get education for current user
   */
  static async getForUser(
    userId: string,
    accessToken: string
  ): Promise<Education[]> {
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);
    return this.getByJobSeekerId(jobSeekerId, accessToken);
  }

  /**
   * Create education entry
   */
  static async create(
    userId: string,
    educationData: CreateEducationInput,
    accessToken: string
  ): Promise<Education> {
    const supabase = createUserClient(accessToken);
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);

    // Check limit
    const existing = await this.getByJobSeekerId(jobSeekerId, accessToken);
    if (existing.length >= MAX_EDUCATION_ENTRIES) {
      throw new DatabaseError(`Maximum ${MAX_EDUCATION_ENTRIES} education entries allowed`);
    }

    const { data, error } = await supabase
      .from('job_seeker_education')
      .insert([{
        ...educationData,
        job_seeker_id: jobSeekerId,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating education:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    return data;
  }

  /**
   * Update education entry
   */
  static async update(
    educationId: string,
    educationData: UpdateEducationInput,
    accessToken: string
  ): Promise<Education> {
    const supabase = createUserClient(accessToken);

    const { data, error } = await supabase
      .from('job_seeker_education')
      .update(educationData)
      .eq('id', educationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating education:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    return data;
  }

  /**
   * Delete education entry
   */
  static async delete(educationId: string, accessToken: string): Promise<void> {
    const supabase = createUserClient(accessToken);

    const { error } = await supabase
      .from('job_seeker_education')
      .delete()
      .eq('id', educationId);

    if (error) {
      console.error('Error deleting education:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }
  }
}
