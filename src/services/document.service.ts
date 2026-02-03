import { createUserClient } from '../lib/supabase';
import { NotFoundError, DatabaseError } from '../lib/errors';
import { mapSupabaseError } from '../lib/supabase-errors';

export interface ProfileDocument {
    id: string;
    user_id: string;
    job_seeker_id: string;
    document_type: 'resume' | 'license' | 'certification' | 'diploma' | 'transcript' | 'other';
    document_name: string;
    file_url: string;
    file_size?: number;
    mime_type?: string;
    uploaded_at: string;
    expires_at?: string;
    is_verified?: boolean;
    notes?: string;
}

export interface CreateDocumentInput {
    document_type: 'resume' | 'license' | 'certification' | 'diploma' | 'transcript' | 'other';
    document_name: string;
    file_url: string;
    file_size?: number;
    mime_type?: string;
    expires_at?: string;
    notes?: string;
}

export type UpdateDocumentInput = Partial<CreateDocumentInput>;

export class DocumentService {
    /**
     * Get all documents for the authenticated user
     */
    static async list(userId: string, accessToken: string): Promise<ProfileDocument[]> {
        const supabase = createUserClient(accessToken);

        const { data, error } = await supabase
            .from('profile_documents')
            .select('*')
            .eq('user_id', userId)
            .order('uploaded_at', { ascending: false });

        if (error) {
            console.error('Error fetching documents:', error);
            const mapped = mapSupabaseError(error);
            throw new DatabaseError(mapped.message);
        }

        return data || [];
    }

    /**
     * Create a new document metadata entry
     */
    static async create(
        userId: string,
        documentData: CreateDocumentInput,
        accessToken: string
    ): Promise<ProfileDocument> {
        const supabase = createUserClient(accessToken);

        // Get job seeker ID first (assumes profile exists)
        const { data: profile, error: profileError } = await supabase
            .from('job_seekers')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (profileError || !profile) {
            throw new NotFoundError('Job seeker profile not found');
        }

        const { data, error } = await supabase
            .from('profile_documents')
            .insert([{
                ...documentData,
                user_id: userId,
                job_seeker_id: profile.id,
                uploaded_at: new Date().toISOString(),
                is_verified: false
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating document:', error);
            const mapped = mapSupabaseError(error);
            throw new DatabaseError(mapped.message);
        }

        return data;
    }

    /**
     * Update a document metadata entry
     */
    static async update(
        userId: string,
        documentId: string,
        documentData: UpdateDocumentInput,
        accessToken: string
    ): Promise<ProfileDocument> {
        const supabase = createUserClient(accessToken);

        const { data, error } = await supabase
            .from('profile_documents')
            .update(documentData)
            .eq('id', documentId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating document:', error);
            const mapped = mapSupabaseError(error);
            throw new DatabaseError(mapped.message);
        }

        return data;
    }

    /**
     * Delete a document metadata entry
     */
    static async delete(
        userId: string,
        documentId: string,
        accessToken: string
    ): Promise<void> {
        const supabase = createUserClient(accessToken);

        const { error } = await supabase
            .from('profile_documents')
            .delete()
            .eq('id', documentId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting document:', error);
            const mapped = mapSupabaseError(error);
            throw new DatabaseError(mapped.message);
        }
    }
}
