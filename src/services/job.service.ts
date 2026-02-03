import { createUserClient, createServiceClient } from '../lib/supabase';
import { NotFoundError, DatabaseError, ForbiddenError } from '../lib/errors';
import { isNotFoundError, mapSupabaseError } from '../lib/supabase-errors';
import type { CreateJobInput, UpdateJobInput, JobFilters } from '../schemas/job.schema';

/**
 * Job Interface
 * Maps to jobs table in database
 */
export interface Job {
  id: string;
  employer_id: string;
  title: string;
  department?: string | null;
  location: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'per-diem';
  category: string;
  experience: 'entry-level' | 'mid-level' | 'senior-level' | 'expert-level';
  salary_min?: number | null;
  salary_max?: number | null;
  salary_display?: string | null;
  facility_type: string;
  description: string;
  status: 'active' | 'pending' | 'closed' | 'expired';
  is_urgent: boolean;
  rank: number;
  spend_limit?: number | null;
  applicants_count: number;
  views_count: number;
  posted_date: string;
  expiry_date?: string | null;
  deadline?: string | null;
  created_at: string;
  updated_at: string;
  requirements?: JobRequirement[];
  benefits?: JobBenefit[];
  tags?: JobTag[];
  employers?: {
    facility_name: string;
  };
}

export interface JobRequirement {
  id: string;
  job_id: string;
  requirement: string;
  created_at: string;
}

export interface JobBenefit {
  id: string;
  job_id: string;
  benefit: string;
  created_at: string;
}

export interface JobTag {
  id: string;
  job_id: string;
  tag: string;
  created_at: string;
}

export interface PaginatedJobs {
  data: Job[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Job Service
 * Handles CRUD operations for job postings
 * Uses user's JWT to maintain RLS context for mutations
 */
export class JobService {
  /**
   * Get public jobs with filters and pagination
   * Uses service client for public read access
   */
  static async getPublicJobs(filters: JobFilters): Promise<PaginatedJobs> {
    const supabase = createServiceClient();
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('jobs')
      .select(`
        *,
        requirements:job_requirements(*),
        benefits:job_benefits(*),
        tags:job_tags(*),
        employers!employer_id(facility_name)
      `, { count: 'exact' })
      .eq('status', 'active')
      .order('posted_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filters.category && filters.category !== 'All Categories') {
      query = query.eq('category', filters.category);
    }
    if (filters.location && filters.location !== 'All Locations') {
      query = query.ilike('location', `%${filters.location}%`);
    }
    if (filters.employment_type) {
      query = query.eq('employment_type', filters.employment_type);
    }
    if (filters.experience) {
      query = query.eq('experience', filters.experience);
    }
    if (filters.facility_type && filters.facility_type !== 'All Facilities') {
      query = query.eq('facility_type', filters.facility_type);
    }
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      query = query.or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching public jobs:', error);
      throw new DatabaseError('Failed to fetch jobs');
    }

    const total = count || 0;

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single job by ID (public)
   */
  static async getById(jobId: string): Promise<Job | null> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        requirements:job_requirements(*),
        benefits:job_benefits(*),
        tags:job_tags(*),
        employers!employer_id(facility_name)
      `)
      .eq('id', jobId)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      console.error('Error fetching job:', error);
      return null;
    }

    return data;
  }

  /**
   * Get employer profile ID for a user
   */
  private static async getEmployerProfileId(
    userId: string,
    accessToken: string
  ): Promise<string> {
    const supabase = createUserClient(accessToken);

    const { data, error } = await supabase
      .from('employers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Employer profile not found');
    }

    return data.id;
  }

  /**
   * Get jobs for a specific user (employer)
   * Uses authenticated user's token
   */
  static async getByUserId(
    userId: string,
    accessToken: string
  ): Promise<Job[]> {
    const supabase = createUserClient(accessToken);

    try {
      const employerId = await this.getEmployerProfileId(userId, accessToken);

      const { data, error } = await supabase
        .from('jobs')
        .select(`
        *,
        requirements:job_requirements(*),
        benefits:job_benefits(*),
        tags:job_tags(*)
      `)
        .eq('employer_id', employerId)
        .order('posted_date', { ascending: false });

      if (error) {
        console.error('Error fetching employer jobs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting employer profile:', error);
      return [];
    }
  }

  /**
   * Create a new job posting
   * Uses authenticated user's token for RLS
   */
  static async create(
    userId: string,
    jobData: CreateJobInput,
    accessToken: string
  ): Promise<Job> {
    const supabase = createUserClient(accessToken);
    const now = new Date().toISOString();

    const employerId = await this.getEmployerProfileId(userId, accessToken);

    // Extract related data
    const { requirements, benefits, tags, ...jobFields } = jobData;

    // Insert job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert([{
        employer_id: employerId,
        ...jobFields,
        posted_date: now,
      }])
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      const mapped = mapSupabaseError(jobError);
      throw new DatabaseError(mapped.message);
    }

    // Insert requirements
    if (requirements && requirements.length > 0) {
      const { error: reqError } = await supabase
        .from('job_requirements')
        .insert(requirements.map((req) => ({
          job_id: job.id,
          requirement: req.trim(),
        })));

      if (reqError) {
        console.error('Error inserting requirements:', reqError);
      }
    }

    // Insert benefits
    if (benefits && benefits.length > 0) {
      const { error: benError } = await supabase
        .from('job_benefits')
        .insert(benefits.map((benefit) => ({
          job_id: job.id,
          benefit: benefit.trim(),
        })));

      if (benError) {
        console.error('Error inserting benefits:', benError);
      }
    }

    // Insert tags
    if (tags && tags.length > 0) {
      const { error: tagError } = await supabase
        .from('job_tags')
        .insert(tags.map((tag) => ({
          job_id: job.id,
          tag: tag.trim(),
        })));

      if (tagError) {
        console.error('Error inserting tags:', tagError);
      }
    }

    // Fetch complete job with related data
    const completeJob = await this.getById(job.id);
    return completeJob || job;
  }

  /**
   * Update an existing job posting
   * Verifies ownership before updating
   */
  static async update(
    jobId: string,
    userId: string,
    jobData: UpdateJobInput,
    accessToken: string
  ): Promise<Job> {
    const supabase = createUserClient(accessToken);
    const employerId = await this.getEmployerProfileId(userId, accessToken);

    // Verify ownership
    const existing = await this.getById(jobId);
    if (!existing) {
      throw new NotFoundError('Job not found');
    }
    if (existing.employer_id !== employerId) {
      throw new ForbiddenError('You do not have permission to update this job');
    }

    // Extract related data
    const { requirements, benefits, tags, ...jobFields } = jobData;

    // Update job
    const { data, error } = await supabase
      .from('jobs')
      .update({
        ...jobFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('employer_id', employerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating job:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    // Update requirements if provided
    if (requirements !== undefined) {
      await supabase.from('job_requirements').delete().eq('job_id', jobId);
      if (requirements.length > 0) {
        await supabase.from('job_requirements').insert(
          requirements.map((req: string) => ({ job_id: jobId, requirement: req.trim() }))
        );
      }
    }

    // Update benefits if provided
    if (benefits !== undefined) {
      await supabase.from('job_benefits').delete().eq('job_id', jobId);
      if (benefits.length > 0) {
        await supabase.from('job_benefits').insert(
          benefits.map((benefit: string) => ({ job_id: jobId, benefit: benefit.trim() }))
        );
      }
    }

    // Update tags if provided
    if (tags !== undefined) {
      await supabase.from('job_tags').delete().eq('job_id', jobId);
      if (tags.length > 0) {
        await supabase.from('job_tags').insert(
          tags.map((tag: string) => ({ job_id: jobId, tag: tag.trim() }))
        );
      }
    }

    // Fetch updated job with related data
    const updatedJob = await this.getById(jobId);
    return updatedJob || data;
  }

  /**
   * Delete a job posting
   * Verifies ownership before deleting
   */
  static async delete(
    jobId: string,
    userId: string,
    accessToken: string
  ): Promise<void> {
    const supabase = createUserClient(accessToken);
    const employerId = await this.getEmployerProfileId(userId, accessToken);

    // Verify ownership
    const existing = await this.getById(jobId);
    if (!existing) {
      throw new NotFoundError('Job not found');
    }
    if (existing.employer_id !== employerId) {
      throw new ForbiddenError('You do not have permission to delete this job');
    }

    // Delete job (cascades to requirements, benefits, tags via FK)
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)
      .eq('employer_id', employerId);

    if (error) {
      console.error('Error deleting job:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }
  }

  /**
   * Increment view count for a job
   * Uses service client since this is a public action
   */
  static async incrementViewCount(jobId: string): Promise<void> {
    const supabase = createServiceClient();

    const { error } = await supabase.rpc('increment', {
      row_id: jobId,
      table_name: 'jobs',
      column_name: 'views_count',
    });

    if (error) {
      // Non-critical, just log
      console.error('Error incrementing view count:', error);
    }
  }

  /**
   * Get job count for a user (employer)
   */
  static async getCountByUserId(
    userId: string,
    accessToken: string
  ): Promise<number> {
    const supabase = createUserClient(accessToken);

    try {
      const employerId = await this.getEmployerProfileId(userId, accessToken);

      const { count, error } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', employerId);

      if (error) {
        console.error('Error counting jobs:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting employer profile for count:', error);
      return 0;
    }
  }
}
