import { createUserClient } from '../lib/supabase';
import { NotFoundError, DatabaseError, ConflictError } from '../lib/errors';
import { mapSupabaseError } from '../lib/supabase-errors';

/**
 * Saved Job Interface
 */
export interface SavedJob {
  id: string;
  job_seeker_id: string;
  job_id: string;
  saved_date: string;
}

export interface SavedJobWithDetails extends SavedJob {
  job?: {
    id: string;
    title: string;
    location: string;
    employment_type: string;
    category: string;
    salary_display?: string;
    salary_min?: number;
    salary_max?: number;
    posted_date: string;
    description: string;
    facility_type: string;
    is_urgent?: boolean;
    experience: string;
    requirements?: { requirement: string }[];
    benefits?: { benefit: string }[];
    employers?: {
      facility_name: string;
    };
  };
}

/**
 * Saved Job Service
 */
export class SavedJobService {
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
   * Get all saved jobs for a user
   */
  static async getForUser(
    userId: string,
    accessToken: string
  ): Promise<SavedJob[]> {
    const supabase = createUserClient(accessToken);
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);

    const { data, error } = await supabase
      .from('saved_jobs')
      .select('*')
      .eq('job_seeker_id', jobSeekerId)
      .order('saved_date', { ascending: false });

    if (error) {
      console.error('Error fetching saved jobs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get saved jobs with full job details
   */
  static async getWithDetails(
    userId: string,
    accessToken: string
  ): Promise<SavedJobWithDetails[]> {
    const supabase = createUserClient(accessToken);
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);

    const { data, error } = await supabase
      .from('saved_jobs')
      .select(`
        *,
        job:job_id (
          id, title, location, employment_type, category,
          salary_display, salary_min, salary_max, posted_date,
          description, facility_type, is_urgent, experience,
          requirements:job_requirements(requirement),
          benefits:job_benefits(benefit),
          employers:employer_id(facility_name)
        )
      `)
      .eq('job_seeker_id', jobSeekerId)
      .order('saved_date', { ascending: false });

    if (error) {
      console.error('Error fetching saved jobs with details:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Save a job
   */
  static async save(
    userId: string,
    jobId: string,
    accessToken: string
  ): Promise<SavedJob> {
    const supabase = createUserClient(accessToken);
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_jobs')
      .select('id')
      .eq('job_seeker_id', jobSeekerId)
      .eq('job_id', jobId)
      .single();

    if (existing) {
      throw new ConflictError('Job is already saved');
    }

    const { data, error } = await supabase
      .from('saved_jobs')
      .insert([{
        job_seeker_id: jobSeekerId,
        job_id: jobId,
        saved_date: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving job:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    return data;
  }

  /**
   * Unsave a job
   */
  static async unsave(
    userId: string,
    jobId: string,
    accessToken: string
  ): Promise<void> {
    const supabase = createUserClient(accessToken);
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);

    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('job_seeker_id', jobSeekerId)
      .eq('job_id', jobId);

    if (error) {
      console.error('Error unsaving job:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }
  }

  /**
   * Check if a job is saved
   */
  static async isSaved(
    userId: string,
    jobId: string,
    accessToken: string
  ): Promise<boolean> {
    const supabase = createUserClient(accessToken);
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);

    const { data } = await supabase
      .from('saved_jobs')
      .select('id')
      .eq('job_seeker_id', jobSeekerId)
      .eq('job_id', jobId)
      .single();

    return !!data;
  }

  /**
   * Get count of saved jobs
   */
  static async getCount(
    userId: string,
    accessToken: string
  ): Promise<number> {
    const supabase = createUserClient(accessToken);
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);

    const { count, error } = await supabase
      .from('saved_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('job_seeker_id', jobSeekerId);

    if (error) {
      console.error('Error counting saved jobs:', error);
      return 0;
    }

    return count || 0;
  }
}
