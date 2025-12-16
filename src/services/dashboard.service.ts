import { createUserClient } from '../lib/supabase';
import { NotFoundError } from '../lib/errors';

/**
 * Dashboard Stats Interface
 */
export interface JobSeekerDashboardStats {
  totalApplications: number;
  profileViews: number;
  interviewsScheduled: number;
  jobOffers: number;
  applicationsByStatus: {
    applied: number;
    underReview: number;
    interviewScheduled: number;
    offered: number;
    rejected: number;
  };
}

export interface EmployerDashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  totalViews: number;
  applicationsByStatus: {
    applied: number;
    underReview: number;
    interviewScheduled: number;
    offered: number;
    rejected: number;
  };
}

/**
 * Dashboard Service
 */
export class DashboardService {
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
   * Get job seeker dashboard stats
   */
  static async getJobSeekerStats(
    userId: string,
    accessToken: string
  ): Promise<JobSeekerDashboardStats> {
    const supabase = createUserClient(accessToken);

    const defaultStats: JobSeekerDashboardStats = {
      totalApplications: 0,
      profileViews: 0,
      interviewsScheduled: 0,
      jobOffers: 0,
      applicationsByStatus: {
        applied: 0,
        underReview: 0,
        interviewScheduled: 0,
        offered: 0,
        rejected: 0,
      },
    };

    try {
      const jobSeekerId = await this.getJobSeekerProfileId(userId, accessToken);

      // Get applications
      const { data: applications } = await supabase
        .from('applications')
        .select('status')
        .eq('job_seeker_id', jobSeekerId);

      // Get profile views count
      const { count: profileViews } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('job_seeker_id', jobSeekerId);

      if (!applications) {
        return { ...defaultStats, profileViews: profileViews || 0 };
      }

      const stats: JobSeekerDashboardStats = {
        totalApplications: applications.length,
        profileViews: profileViews || 0,
        interviewsScheduled: 0,
        jobOffers: 0,
        applicationsByStatus: {
          applied: 0,
          underReview: 0,
          interviewScheduled: 0,
          offered: 0,
          rejected: 0,
        },
      };

      applications.forEach((app) => {
        switch (app.status) {
          case 'applied':
            stats.applicationsByStatus.applied++;
            break;
          case 'under-review':
            stats.applicationsByStatus.underReview++;
            break;
          case 'interview-scheduled':
            stats.applicationsByStatus.interviewScheduled++;
            stats.interviewsScheduled++;
            break;
          case 'offered':
            stats.applicationsByStatus.offered++;
            stats.jobOffers++;
            break;
          case 'rejected':
            stats.applicationsByStatus.rejected++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error fetching job seeker dashboard stats:', error);
      return defaultStats;
    }
  }

  /**
   * Get employer dashboard stats
   */
  static async getEmployerStats(
    userId: string,
    accessToken: string
  ): Promise<EmployerDashboardStats> {
    const supabase = createUserClient(accessToken);

    const defaultStats: EmployerDashboardStats = {
      totalJobs: 0,
      activeJobs: 0,
      totalApplications: 0,
      totalViews: 0,
      applicationsByStatus: {
        applied: 0,
        underReview: 0,
        interviewScheduled: 0,
        offered: 0,
        rejected: 0,
      },
    };

    try {
      const employerId = await this.getEmployerProfileId(userId, accessToken);

      // Get jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, status, views_count')
        .eq('employer_id', employerId);

      if (!jobs || jobs.length === 0) {
        return defaultStats;
      }

      const jobIds = jobs.map((j) => j.id);

      // Get applications for all jobs
      const { data: applications } = await supabase
        .from('applications')
        .select('status')
        .in('job_id', jobIds);

      const stats: EmployerDashboardStats = {
        totalJobs: jobs.length,
        activeJobs: jobs.filter((j) => j.status === 'active').length,
        totalApplications: applications?.length || 0,
        totalViews: jobs.reduce((sum, j) => sum + (j.views_count || 0), 0),
        applicationsByStatus: {
          applied: 0,
          underReview: 0,
          interviewScheduled: 0,
          offered: 0,
          rejected: 0,
        },
      };

      applications?.forEach((app) => {
        switch (app.status) {
          case 'applied':
            stats.applicationsByStatus.applied++;
            break;
          case 'under-review':
            stats.applicationsByStatus.underReview++;
            break;
          case 'interview-scheduled':
            stats.applicationsByStatus.interviewScheduled++;
            break;
          case 'offered':
            stats.applicationsByStatus.offered++;
            break;
          case 'rejected':
            stats.applicationsByStatus.rejected++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error fetching employer dashboard stats:', error);
      return defaultStats;
    }
  }
}
