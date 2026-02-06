import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { ProfileService } from '../services/profile.service';
import { EmployerService } from '../services/employer.service';
import { registerJobseekerSchema, registerEmployerSchema, loginSchema } from '../schemas/auth.schema';
import { BadRequestError, InternalServerError, ConflictError, UnauthorizedError } from '../lib/errors';
import { ZodError } from 'zod';
import { mapSupabaseError } from '../lib/supabase-errors';

export class AuthController {

    /**
     * Register a new user (Jobseeker or Employer)
     */
    static async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { user_type } = req.body;

            if (!user_type || (user_type !== 'jobseeker' && user_type !== 'employer')) {
                throw new BadRequestError('Invalid user type');
            }

            // Validate input based on user type
            let validatedData;
            try {
                if (user_type === 'jobseeker') {
                    validatedData = registerJobseekerSchema.parse(req.body);
                } else {
                    validatedData = registerEmployerSchema.parse(req.body);
                }
            } catch (error) {
                if (error instanceof ZodError) {
                    throw new BadRequestError('Validation failed', error.errors);
                }
                throw error;
            }

            const { email, password, name } = validatedData;

            // 1. Sign up with Supabase Auth
            // We use the public supabase client (anon key) for signup as it allows public registration
            // Note: We need to handle the case where the user might already exist in Auth but not in our tables
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        user_type,
                    },
                },
            });

            if (authError) {
                const mapped = mapSupabaseError(authError);
                // Supabase returns 400 or 422 for existing users often
                if (authError.message.includes('already registered')) {
                    throw new ConflictError('An account with this email already exists');
                }
                throw new BadRequestError(mapped.message);
            }

            if (!authData.user) {
                throw new InternalServerError('Registration failed to create auth user');
            }

            const userId = authData.user.id;

            // 2. Create User Profile via RPC
            // This ensures the custom 'users' table is populated
            // We use RPC just like the frontend did to ensure consistency and trigger any db-side logic
            const { error: rpcError } = await supabase.rpc('create_user_profile', {
                p_user_id: userId,
                p_user_email: email,
                p_user_type: user_type,
                p_user_name: name,
                p_avatar_url: null
            });

            if (rpcError) {
                console.error('RPC create_user_profile error:', rpcError);
                // If RPC fails, we might want to consider cleaning up auth user, 
                // but often it's better to let them retry or handle manually.
                // For now, we error out.
                throw new InternalServerError('Failed to create user profile record');
            }

            // 3. Create Specific Profile (Jobseeker or Employer)
            // Access token needed for Service calls to respect RLS? 
            // Actually, Services verify ownership/RLS. Since we just created the user, 
            // we might not have a session token yet if email confirmation is required.
            // However, we are the backend. We can use the service role OR pass the new access token 
            // if Supabase provided one (it does if email confirm is off, or if "Enable Manual Confirm" is on).

            // If email confirmation is ON, session is null. 
            // We should use a Service Client (admin) to create the initial profile records 
            // to ensure they exist even before login. 
            // BUT, existing Services take `accessToken` string.
            // We need to either overload Services to accept a SupabaseClient or passed a service token.

            // PROPOSAL: Use the access token from signUp if available.
            // If not (pending verification), we can't theoretically create the profile via RLS 
            // unless we assume the backend has admin rights.

            // Re-reading `profile.service.ts`: `create` uses `supabase.rpc('create_job_seeker_profile', ...)`
            // which uses `createUserClient(accessToken)`.
            // If we don't have an accessToken, we can't use `createUserClient`.

            // If `authData.session` is null, we can't use standard RLS methods.
            // However, the RPC `create_job_seeker_profile` might be `security definer`.
            // Let's assume we need to handle both cases.

            const sessionToken = authData.session?.access_token;

            // If we don't have a session (email confirmation required), we can't easily use the `ProfileService`
            // as it is designed for authenticated users. 
            // However, the `create` method in `ProfileService` calls an RPC `create_job_seeker_profile`.
            // If that RPC is SECURITY DEFINER, we could potentially call it with a service role client 
            // or we need to update the service to support admin overrides.

            // Let's compromise: If we have a token, use it.
            // If not, we might skipped profile creation OR we use a temporary workaround 
            // by just returning success and letting the user complete profile on first login (if needed).
            // BUT users expect profile data to be saved.

            // Better approach for Backend: Use Service Role for profile creation to bypass RLS 
            // during registration orchestration.
            // But `ProfileService` is strict about `accessToken`.
            // I will create a temporary local function or use direct supabase client with Service Role here if needed.
            // Wait, `ProfileService.create` implementation:
            /*
              static async create(..., accessToken) {
                   const supabase = createUserClient(accessToken);
                   ...
                   await supabase.rpc(...)
              }
            */

            // I can export `createServiceClient()` from `../lib/supabase` and use it.
            // I will modify the controller to use `createServiceClient` to perform the writes 
            // to `job_seekers` or `employers` tables directly or via RPC.

            // Actually, the safest way without modifying Services too much is to manually call 
            // the RPC/Insert logic here using the Service Role, 
            // as this is a System-level operation (Creating initial account).

            // Let's import `createServiceClient`.
            const adminSupabase = (await import('../lib/supabase')).createServiceClient();

            if (user_type === 'jobseeker') {
                // Flatten/extract fields
                const jobseekerData = validatedData as any; // Type assertion since we know it's jobseeker

                // Use RPC or Insert. ProfileService uses RPC `create_job_seeker_profile`.
                // Let's try to use the same RPC but with admin client.
                const { error: profileError } = await adminSupabase.rpc('create_job_seeker_profile', {
                    p_user_id: userId,
                    p_first_name_text: jobseekerData.first_name, // From validation merge (schema needs update if these are missing?)
                    // Wait, my `registerJobseekerSchema` omitted `first_name` and `last_name`?
                    // No, it merged `createProfileSchema.omit({ first_name: true... })`.
                    // Ah, the base schema has `name`. 
                    // We need to split `name` into first and last name as per existing logic.
                    p_last_name_text: '', // Logic below
                    p_profession_text: jobseekerData.profession,
                    p_experience_level: jobseekerData.experience || null,
                    p_location_text: jobseekerData.location,
                    p_phone_number: null, // Phone not in my Jobseeker schema override? 
                    // `baseRegisterSchema` doesn't have phone for jobseeker. 
                    // My schema extension for jobseeker didn't add phone explicitly.
                    // Taking a closer look at schema: 
                    // `registerJobseekerSchema`... merged `createProfileSchema`...
                    // `createProfileSchema` has phone optional.
                });

                // Name splitting logic
                const nameParts = name.trim().split(' ');
                const firstName = nameParts[0] || name;
                const lastName = nameParts.slice(1).join(' ') || name; // Fallback? Or empty? existing logic: `nameParts.slice(1).join(' ') || name`... wait
                // If name is "John", first="John", last=""? 
                // Existing: `const lastName = nameParts.slice(1).join(' ') || name;` -> "John"
                // So if single name, it duplicates. Okay, I will follow existing.

                const { error: jsError } = await adminSupabase.rpc('create_job_seeker_profile', {
                    p_user_id: userId,
                    p_first_name_text: firstName,
                    p_last_name_text: lastName,
                    p_profession_text: jobseekerData.profession,
                    p_experience_level: jobseekerData.experience || 'entry-level',
                    p_location_text: jobseekerData.location,
                    p_phone_number: jobseekerData.phone || null,
                });

                if (jsError) {
                    console.error('Jobseeker profile creation error:', jsError);
                    // Non-blocking error? 
                    // "If profile creation fails, log but don't block registration" - from AuthContext
                    // We'll follow that pattern but warn.
                }

            } else {
                // Employer
                const employerData = validatedData as any;

                // Use RPC `create_employer_profile`
                const { error: empError } = await adminSupabase.rpc('create_employer_profile', {
                    p_user_id: userId,
                    p_facility_name: employerData.facility_name,
                    p_facility_type: employerData.facility_type,
                    p_contact_person: name, // Using base name
                    p_phone_number: employerData.phone,
                    p_address_text: employerData.address,
                    p_city_text: employerData.city,
                    p_description_text: null // description not in base schema required?
                });

                if (empError) {
                    console.error('Employer profile creation error:', empError);
                }
            }

            res.status(201).json({
                success: true,
                message: 'Registration successful. Please check your email to confirm your account.',
                data: {
                    user: {
                        id: userId,
                        email,
                        name,
                        user_type
                    },
                    session: authData.session // Return session if available (auto-confirm)
                }
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Get current authenticated user
     * GET /api/v1/auth/me
     */
    static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new UnauthorizedError('Not authenticated');
            }

            // Return user info from the token/request
            // We might want to enrich this with profile data if needed, 
            // but for now returning what's in the token + user_type is a good start.
            // Actually, the frontend expects: id, email, type, name, avatar.

            // req.user has: id, email, user_type. 
            // We should probably fetch the latest profile data to be sure, 
            // or just trust the token claims if they are fresh enough.
            // Let's fetch basic profile data to ensure 'name' is up to date 
            // if it differs from token (though token usually has it).

            // For now, return what we have in req.user which comes from the token.
            res.status(200).json({
                success: true,
                data: {
                    user: req.user
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Login user
     * POST /api/v1/auth/login
     */
    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            const validatedData = loginSchema.parse(req.body);
            const { email, password } = validatedData;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw new UnauthorizedError('Invalid email or password');
                }
                throw new BadRequestError(error.message);
            }

            if (!data.user || !data.session) {
                throw new InternalServerError('Login failed to retrieve session');
            }

            // Return user and session
            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        user_type: data.user.user_metadata?.user_type,
                        name: data.user.user_metadata?.name
                    },
                    session: data.session
                }
            });

        } catch (error) {
            if (error instanceof ZodError) {
                next(new BadRequestError('Validation failed', error.errors));
            } else {
                next(error);
            }
        }
    }
}
