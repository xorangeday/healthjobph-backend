import { createUserClient } from '../lib/supabase';
import { NotFoundError, DatabaseError, ForbiddenError, ConflictError } from '../lib/errors';
import { isNotFoundError, mapSupabaseError } from '../lib/supabase-errors';
import type { CreateApplicationInput, UpdateApplicationStatusInput, ApplicationStatus } from '../schemas/application.schema';

/**
 * Application Interface
 * Maps to applications table in database
 */
export interface Application {
  id: string;
  job_id: string;
  job_seeker_id: string;
  status: ApplicationStatus;
  cover_letter?: string | null;
  resume_url?: string | null;
  notes?: string | null;
  applied_date: string;
  updated_at: string;
  // Joined data
  jobs?: {
    id: string;
    title: string;
    employer_id: string;
    location?: string;
    employment_type?: string;
    facility_type?: string;
  };
  job_seekers?: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string;
    location?: string;
    profession?: string;
    experience?: string;
    user_id: string;
  };
}

export interface ApplicationWithDetails extends Application {
  job_title?: string;
  job_seeker_name?: string;
  job_seeker_email?: string;
  job_seeker_phone?: string;
  job_seeker_location?: string;
  job_seeker_profession?: string;
}

export interface ApplicationStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
}

/**
 * Application Service
 * Handles CRUD operations for job applications
 */
export class ApplicationService {
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
      throw new NotFoundError('Job seeker profile not found. Please complete your profile first.');
    }

    return data.id;
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
      throw new NotFoundError('Employer profile not found.');
    }

    return data.id;
  }

  /**
   * Verify job seeker owns the application
   */
  private static async verifyJobSeekerOwnership(
    applicationId: string,
    userId: string,
    accessToken: string
  ): Promise<Application> {
    const supabase = createUserClient(accessToken);

    const { data: application, error } = await supabase
      .from('applications')
      .select(`
        *,
        job_seekers!inner(user_id)
      `)
      .eq('id', applicationId)
      .single();

    if (error || !application) {
      if (error && isNotFoundError(error)) {
        throw new NotFoundError('Application not found');
      }
      throw new DatabaseError('Failed to fetch application');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((application.job_seekers as any).user_id !== userId) {
      throw new ForbiddenError('You do not have permission to access this application');
    }

    return application;
  }

  /**
   * Verify employer owns the job for this application
   */
  private static async verifyEmployerOwnership(
    applicationId: string,
    userId: string,
    accessToken: string
  ): Promise<Application> {
    const supabase = createUserClient(accessToken);

    const { data: application, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs!inner(employer_id, employers!inner(user_id))
      `)
      .eq('id', applicationId)
      .single();

    if (error || !application) {
      if (error && isNotFoundError(error)) {
        throw new NotFoundError('Application not found');
      }
      throw new DatabaseError('Failed to fetch application');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((application.jobs as any).employers.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to access this application');
    }

    return application;
  }

  /**
   * Create a new application (job seeker only)
   */
  static async create(
    userId: string,
    applicationData: CreateApplicationInput,
    accessToken: string
  ): Promise<Application> {
    const supabase = createUserClient(accessToken);

    // Get job seeker profile
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);

    // Check if already applied
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', applicationData.job_id)
      .eq('job_seeker_id', jobSeekerId)
      .maybeSingle();

    if (existing) {
      throw new ConflictError('You have already applied to this job');
    }

    // Verify job exists and is active
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('id', applicationData.job_id)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.status !== 'active') {
      throw new ForbiddenError('This job is no longer accepting applications');
    }

    // Create application
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('applications')
      .insert([{
        job_id: applicationData.job_id,
        job_seeker_id: jobSeekerId,
        status: 'applied',
        cover_letter: applicationData.cover_letter,
        resume_url: applicationData.resume_url,
        applied_date: now,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating application:', error);
      if (error.code === '23505') {
        throw new ConflictError('You have already applied to this job');
      }
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    return data;
  }

  /**
   * Get applications for the current job seeker
   */
  static async getByJobSeeker(
    userId: string,
    accessToken: string
  ): Promise<Application[]> {
    const supabase = createUserClient(accessToken);

    // Get job seeker profile
    const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs(id, title, location, employment_type, facility_type, employer_id)
      `)
      .eq('job_seeker_id', jobSeekerId)
      .order('applied_date', { ascending: false });

    if (error) {
      console.error('Error fetching job seeker applications:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get applications for all of an employer's jobs
   */
  static async getByEmployer(
    userId: string,
    accessToken: string
  ): Promise<ApplicationWithDetails[]> {
    const supabase = createUserClient(accessToken);

    // Get employer profile
    const employerId = await this.getEmployerProfileId(userId, accessToken);

    // Get applications for employer's jobs
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs!inner(id, title, employer_id),
        job_seekers(id, first_name, last_name, phone, location, profession, experience, user_id)
      `)
      .eq('jobs.employer_id', employerId)
      .order('applied_date', { ascending: false });

    if (error) {
      console.error('Error fetching employer applications:', error);
      return [];
    }

    if (!data) return [];

    // Fetch emails for job seekers (separate query due to RLS)
    const applicationsWithDetails = await Promise.all(
      data.map(async (app) => {
        let email = '';
        if (app.job_seekers?.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', app.job_seekers.user_id)
            .maybeSingle();
          email = userData?.email || '';
        }

        return {
          ...app,
          job_title: app.jobs?.title,
          job_seeker_name: app.job_seekers
            ? `${app.job_seekers.first_name} ${app.job_seekers.last_name}`
            : undefined,
          job_seeker_email: email,
          job_seeker_phone: app.job_seekers?.phone,
          job_seeker_location: app.job_seekers?.location,
          job_seeker_profession: app.job_seekers?.profession,
        };
      })
    );

    return applicationsWithDetails;
  }

  /**
   * Get applications for a specific job (employer only)
   */
  static async getByJob(
    jobId: string,
    userId: string,
    accessToken: string
  ): Promise<ApplicationWithDetails[]> {
    const supabase = createUserClient(accessToken);

    // Verify employer owns the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, employer_id, employers!inner(user_id)')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((job.employers as any).user_id !== userId) {
      throw new ForbiddenError('You do not have permission to view applications for this job');
    }

    // Get applications
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job_seekers(id, first_name, last_name, phone, location, profession, experience, user_id)
      `)
      .eq('job_id', jobId)
      .order('applied_date', { ascending: false });

    if (error) {
      console.error('Error fetching job applications:', error);
      return [];
    }

    if (!data) return [];

    // Fetch emails
    const applicationsWithDetails = await Promise.all(
      data.map(async (app) => {
        let email = '';
        if (app.job_seekers?.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', app.job_seekers.user_id)
            .maybeSingle();
          email = userData?.email || '';
        }

        return {
          ...app,
          job_seeker_name: app.job_seekers
            ? `${app.job_seekers.first_name} ${app.job_seekers.last_name}`
            : undefined,
          job_seeker_email: email,
          job_seeker_phone: app.job_seekers?.phone,
          job_seeker_location: app.job_seekers?.location,
          job_seeker_profession: app.job_seekers?.profession,
        };
      })
    );

    return applicationsWithDetails;
  }

  /**
   * Get single application by ID
   */
  static async getById(
    applicationId: string,
    userId: string,
    accessToken: string
  ): Promise<Application | null> {
    const supabase = createUserClient(accessToken);

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs(id, title, employer_id, location, employment_type, facility_type),
        job_seekers(id, first_name, last_name, phone, location, profession, experience, user_id)
      `)
      .eq('id', applicationId)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      console.error('Error fetching application:', error);
      return null;
    }

    // Verify access - user must be either the job seeker or the employer
    const isJobSeeker = data.job_seekers?.user_id === userId;

    // Check if user is the employer
    let isEmployer = false;
    if (data.jobs?.employer_id) {
      const { data: employer } = await supabase
        .from('employers')
        .select('user_id')
        .eq('id', data.jobs.employer_id)
        .single();
      isEmployer = employer?.user_id === userId;
    }

    if (!isJobSeeker && !isEmployer) {
      throw new ForbiddenError('You do not have permission to view this application');
    }

    return data;
  }

  /**
   * Update application status (employer only)
   */
  static async updateStatus(
    applicationId: string,
    userId: string,
    updateData: UpdateApplicationStatusInput,
    accessToken: string
  ): Promise<Application> {
    const supabase = createUserClient(accessToken);

    // Verify employer owns the job
    await this.verifyEmployerOwnership(applicationId, userId, accessToken);

    // Update application
    const { data, error } = await supabase
      .from('applications')
      .update({
        status: updateData.status,
        notes: updateData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating application:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    return data;
  }

  /**
   * Withdraw application (job seeker only)
   */
  static async withdraw(
    applicationId: string,
    userId: string,
    accessToken: string
  ): Promise<void> {
    const supabase = createUserClient(accessToken);

    // Verify job seeker owns the application
    await this.verifyJobSeekerOwnership(applicationId, userId, accessToken);

    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', applicationId);

    if (error) {
      console.error('Error withdrawing application:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }
  }

  /**
   * Check if user has applied to a job
   */
  static async hasApplied(
    jobId: string,
    userId: string,
    accessToken: string
  ): Promise<boolean> {
    const supabase = createUserClient(accessToken);

    try {
      const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);

      const { data } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', jobId)
        .eq('job_seeker_id', jobSeekerId)
        .maybeSingle();

      return !!data;
    } catch {
      // If no profile, they haven't applied
      return false;
    }
  }

  /**
   * Get application statistics for a job
   */
  static async getStats(
    jobId: string,
    userId: string,
    accessToken: string
  ): Promise<ApplicationStats> {
    const supabase = createUserClient(accessToken);

    // Verify employer owns the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, employer_id, employers!inner(user_id)')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((job.employers as any).user_id !== userId) {
      throw new ForbiddenError('You do not have permission to view stats for this job');
    }

    // Get applications
    const { data, error } = await supabase
      .from('applications')
      .select('status')
      .eq('job_id', jobId);

    if (error) {
      console.error('Error fetching application stats:', error);
      throw new DatabaseError('Failed to fetch application stats');
    }

    const byStatus: Record<ApplicationStatus, number> = {
      'applied': 0,
      'under-review': 0,
      'interview-scheduled': 0,
      'offered': 0,
      'rejected': 0,
    };

    (data || []).forEach((app) => {
      if (app.status in byStatus) {
        byStatus[app.status as ApplicationStatus]++;
      }
    });

    return {
      total: data?.length || 0,
      byStatus,
    };
  }
}
