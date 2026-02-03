import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service';
import { UnauthorizedError, BadRequestError } from '../lib/errors';

export class DocumentController {
    /**
     * GET /api/v1/documents
     */
    static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || !req.accessToken) {
                throw new UnauthorizedError('Authentication required');
            }

            const documents = await DocumentService.list(req.user.id, req.accessToken);

            res.status(200).json({
                success: true,
                data: documents,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/documents
     */
    static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || !req.accessToken) {
                throw new UnauthorizedError('Authentication required');
            }

            const { document_type, document_name, file_url, file_size, mime_type, expires_at, notes } = req.body;

            if (!document_type || !document_name || !file_url) {
                throw new BadRequestError('Missing required fields');
            }

            const document = await DocumentService.create(
                req.user.id,
                {
                    document_type,
                    document_name,
                    file_url,
                    file_size,
                    mime_type,
                    expires_at,
                    notes
                },
                req.accessToken
            );

            res.status(201).json({
                success: true,
                data: document,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/documents/:id
     */
    static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || !req.accessToken) {
                throw new UnauthorizedError('Authentication required');
            }

            const documentId = req.params.id;
            const updates = req.body;

            const document = await DocumentService.update(
                req.user.id,
                documentId,
                updates,
                req.accessToken
            );

            res.status(200).json({
                success: true,
                data: document,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v1/documents/:id
     */
    static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || !req.accessToken) {
                throw new UnauthorizedError('Authentication required');
            }

            const documentId = req.params.id;

            await DocumentService.delete(req.user.id, documentId, req.accessToken);

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
