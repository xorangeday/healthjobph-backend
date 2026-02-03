import { createUserClient } from '../lib/supabase';
import { NotFoundError, DatabaseError, ConflictError } from '../lib/errors';
import { isNotFoundError, mapSupabaseError } from '../lib/supabase-errors';
import type { UpdateProfileInput, CreateProfileInput } from '../schemas/profile.schema';

/**
 * Healthcare Professional Profile Interface
 * Maps to job_seekers table in database
 */
export interface HealthcareProfessionalProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  profession: string;
  experience?: 'entry-level' | 'mid-level' | 'senior-level' | 'expert-level' | null;
  location: string;
  bio?: string | null;
  availability?: 'full-time' | 'part-time' | 'contract' | 'per-diem' | null;
  expected_salary?: number | null;
  verified?: boolean;
  status?: 'active' | 'pending' | 'suspended' | 'inactive';
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Profile Service
 * Handles CRUD operations for healthcare professional profiles
 * Uses user's JWT to maintain RLS context
 */
export class ProfileService {
  /**
   * Get profile by user ID
   * Uses the authenticated user's token to respect RLS
   */
  static async getByUserId(
    userId: string,
    accessToken: string
  ): Promise<HealthcareProfessionalProfile | null> {
    const supabase = createUserClient(accessToken);

    const { data, error } = await supabase
      .from('job_seekers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      console.error('Error fetching profile:', error);
      return null; // Tier 2: Return null for retrieval failures
    }

    return data;
  }

  /**
   * Get profile by profile ID (for public view)
   * Note: RLS policies should allow this for approved profiles
   */
  static async getById(
    profileId: string,
    accessToken: string
  ): Promise<HealthcareProfessionalProfile | null> {
    const supabase = createUserClient(accessToken);

    const { data, error } = await supabase
      .from('job_seekers')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      console.error('Error fetching profile by ID:', error);
      return null;
    }

    return data;
  }

  /**
   * Get current user's own profile
   */
  static async getCurrentUserProfile(
    accessToken: string,
    userId: string
  ): Promise<HealthcareProfessionalProfile | null> {
    return this.getByUserId(userId, accessToken);
  }

  /**
   * Create a new profile
   * Uses database function to handle creation properly
   */
  static async create(
    userId: string,
    profileData: CreateProfileInput,
    accessToken: string
  ): Promise<HealthcareProfessionalProfile> {
    const supabase = createUserClient(accessToken);

    // Check if profile already exists
    const existing = await this.getByUserId(userId, accessToken);
    if (existing) {
      throw new ConflictError('Profile already exists for this user');
    }

    // Use database function to bypass RLS issues during registration
    const { data, error } = await supabase.rpc('create_job_seeker_profile', {
      p_user_id: userId,
      p_first_name_text: profileData.first_name,
      p_last_name_text: profileData.last_name,
      p_profession_text: profileData.profession,
      p_experience_level: profileData.experience || null,
      p_location_text: profileData.location,
      p_phone_number: profileData.phone || null,
    });

    if (error) {
      console.error('Error creating profile:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    return data as HealthcareProfessionalProfile;
  }

  /**
   * Update existing profile
   */
  static async update(
    userId: string,
    profileData: UpdateProfileInput,
    accessToken: string
  ): Promise<HealthcareProfessionalProfile> {
    const supabase = createUserClient(accessToken);

    // Get existing profile
    const existing = await this.getByUserId(userId, accessToken);

    if (!existing) {
      throw new NotFoundError('Profile not found');
    }

    // Perform update
    const { data, error } = await supabase
      .from('job_seekers')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    return data;
  }

  /**
   * Delete profile
   */
  static async delete(userId: string, accessToken: string): Promise<void> {
    const supabase = createUserClient(accessToken);

    const existing = await this.getByUserId(userId, accessToken);

    if (!existing) {
      throw new NotFoundError('Profile not found');
    }

    const { error } = await supabase
      .from('job_seekers')
      .delete()
      .eq('id', existing.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting profile:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }
  }

  /**
   * Get full profile by Job Seeker ID (Public View)
   * Fetches profile + all related data (skills, education, etc.)
   */
  static async getFullProfileByJobSeekerId(
    jobSeekerId: string,
    accessToken: string
  ): Promise<any> {
    const supabase = createUserClient(accessToken);

    // Fetch profile and related data
    const { data, error } = await supabase
      .from('job_seekers')
      .select('*,skills:job_seeker_skills(*),education:job_seeker_education(*),certifications:job_seeker_certifications(*),work_history:job_seeker_work_history(*,responsibilities:work_history_responsibilities(*))')
      .eq('id', jobSeekerId)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      console.error('Error fetching full profile:', error);
      return null;
    }

    // Also fetch resume if available
    const { data: documents } = await supabase
      .from('profile_documents')
      .select('*')
      .eq('job_seeker_id', jobSeekerId)
      .eq('document_type', 'resume')
      .maybeSingle();

    return {
      ...data,
      resume_document: documents || null
    };
  }
}
