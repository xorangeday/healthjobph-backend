import { createUserClient } from '../lib/supabase';
import { NotFoundError, DatabaseError } from '../lib/errors';
import { mapSupabaseError } from '../lib/supabase-errors';
import type { CreateExperienceInput, UpdateExperienceInput } from '../schemas/experience.schema';
import { calculateDuration } from '../schemas/experience.schema';

const MAX_EXPERIENCE_ENTRIES = 10;

/**
 * Work Experience Interface
 */
export interface WorkExperience {
  id: string;
  job_seeker_id: string;
  position: string;
  facility: string;
  start_date?: string | null;
  end_date?: string | null;
  duration: string;
  is_current?: boolean;
  created_at?: string;
}

/**
 * Experience Service
 */
export class ExperienceService {
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
   * Get all work experiences for a job seeker
   */
  static async getByJobSeekerId(
    jobSeekerId: string,
    accessToken: string
  ): Promise<WorkExperience[]> {
    const supabase = createUserClient(accessToken);

    const { data, error } = await supabase
      .from('job_seeker_work_history')
      .select('*')
      .eq('job_seeker_id', jobSeekerId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching experience:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get experiences for current user
   */
  static async getForUser(
    userId: string,
    accessToken: string
  ): Promise<WorkExperience[]> {
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);
    return this.getByJobSeekerId(jobSeekerId, accessToken);
  }

  /**
   * Create work experience entry
   */
  static async create(
    userId: string,
    experienceData: CreateExperienceInput,
    accessToken: string
  ): Promise<WorkExperience> {
    const supabase = createUserClient(accessToken);
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);

    // Check limit
    const existing = await this.getByJobSeekerId(jobSeekerId, accessToken);
    if (existing.length >= MAX_EXPERIENCE_ENTRIES) {
      throw new DatabaseError(`Maximum ${MAX_EXPERIENCE_ENTRIES} work experience entries allowed`);
    }

    // Auto-calculate duration if dates provided
    const duration = experienceData.duration ||
      (experienceData.start_date ? calculateDuration(experienceData.start_date, experienceData.end_date) : '');

    const { data, error } = await supabase
      .from('job_seeker_work_history')
      .insert([{
        ...experienceData,
        duration,
        job_seeker_id: jobSeekerId,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating experience:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    return data;
  }

  /**
   * Update work experience entry
   */
  static async update(
    experienceId: string,
    experienceData: UpdateExperienceInput,
    accessToken: string
  ): Promise<WorkExperience> {
    const supabase = createUserClient(accessToken);

    const { data, error } = await supabase
      .from('job_seeker_work_history')
      .update(experienceData)
      .eq('id', experienceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating experience:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    return data;
  }

  /**
   * Delete work experience entry
   */
  static async delete(experienceId: string, accessToken: string): Promise<void> {
    const supabase = createUserClient(accessToken);

    const { error } = await supabase
      .from('job_seeker_work_history')
      .delete()
      .eq('id', experienceId);

    if (error) {
      console.error('Error deleting experience:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }
  }
}
