import { createUserClient } from '../lib/supabase';
import { NotFoundError, DatabaseError, ConflictError } from '../lib/errors';
import { isNotFoundError, mapSupabaseError } from '../lib/supabase-errors';
import type { CreateEmployerInput, UpdateEmployerInput } from '../schemas/employer.schema';

/**
 * Employer Profile Interface
 */
export interface EmployerProfile {
  id: string;
  user_id: string;
  facility_name: string;
  phone: string;
  address: string;
  city: string;
  website?: string | null;
  facility_type: string;
  contact_person: string;
  description?: string | null;
  total_employees?: string | null;
  years_in_operation?: string | null;
  verified?: boolean;
  status?: string;
  last_login?: string;
  job_posts_count?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Employer Service
 */
export class EmployerService {
  /**
   * Get employer profile by user ID
   */
  static async getByUserId(
    userId: string,
    accessToken: string
  ): Promise<EmployerProfile | null> {
    const supabase = createUserClient(accessToken);

    const { data, error } = await supabase
      .from('employers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      console.error('Error fetching employer profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Get employer profile by employer ID
   */
  static async getById(
    employerId: string,
    accessToken: string
  ): Promise<EmployerProfile | null> {
    const supabase = createUserClient(accessToken);

    const { data, error } = await supabase
      .from('employers')
      .select('*')
      .eq('id', employerId)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      console.error('Error fetching employer by ID:', error);
      return null;
    }

    return data;
  }

  /**
   * Create employer profile
   */
  static async create(
    userId: string,
    profileData: CreateEmployerInput,
    accessToken: string
  ): Promise<EmployerProfile> {
    const supabase = createUserClient(accessToken);

    // Check if profile already exists
    const existing = await this.getByUserId(userId, accessToken);
    if (existing) {
      throw new ConflictError('Employer profile already exists');
    }

    const { data, error } = await supabase
      .from('employers')
      .insert([{
        ...profileData,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating employer profile:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    return data;
  }

  /**
   * Update employer profile
   */
  static async update(
    userId: string,
    profileData: UpdateEmployerInput,
    accessToken: string
  ): Promise<EmployerProfile> {
    const supabase = createUserClient(accessToken);

    const existing = await this.getByUserId(userId, accessToken);
    if (!existing) {
      throw new NotFoundError('Employer profile not found');
    }

    const { data, error } = await supabase
      .from('employers')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating employer profile:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }

    return data;
  }

  /**
   * Delete employer profile
   */
  static async delete(userId: string, accessToken: string): Promise<void> {
    const supabase = createUserClient(accessToken);

    const existing = await this.getByUserId(userId, accessToken);
    if (!existing) {
      throw new NotFoundError('Employer profile not found');
    }

    const { error } = await supabase
      .from('employers')
      .delete()
      .eq('id', existing.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting employer profile:', error);
      const mapped = mapSupabaseError(error);
      throw new DatabaseError(mapped.message);
    }
  }
}
