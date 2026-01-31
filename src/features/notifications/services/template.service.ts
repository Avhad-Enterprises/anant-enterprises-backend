import { eq } from 'drizzle-orm';
import { db } from '../../../database';
import { notificationTemplates } from '../shared/notification-templates.schema';
import { logger } from '../../../utils';
import type { RenderTemplateResult } from '../shared/types';

class TemplateService {
    /**
     * Render notification template with variables
     * 
     * @param templateCode - Unique template code (e.g., 'ORDER_CREATED')
     * @param variables - Object containing variable values
     * @returns Rendered template for all channels
     */
    async renderTemplate(
        templateCode: string,
        variables: Record<string, any>
    ): Promise<RenderTemplateResult> {
        try {
            // Fetch template from database
            const [template] = await db
                .select()
                .from(notificationTemplates)
                .where(eq(notificationTemplates.code, templateCode))
                .limit(1);

            if (!template) {
                throw new Error(`Template not found: ${templateCode}`);
            }

            if (!template.is_active) {
                throw new Error(`Template is inactive: ${templateCode}`);
            }

            // Render each template field with variable substitution
            return {
                type: templateCode,
                title: this.replaceVariables(template.in_app_title || '', variables),
                message: this.replaceVariables(template.in_app_message || '', variables),
                emailSubject: template.subject
                    ? this.replaceVariables(template.subject, variables)
                    : undefined,
                emailHtml: template.body_html
                    ? this.replaceVariables(template.body_html, variables)
                    : undefined,
                emailText: template.body_text
                    ? this.replaceVariables(template.body_text, variables)
                    : undefined,
                smsMessage: template.sms_template
                    ? this.replaceVariables(template.sms_template, variables)
                    : undefined,
            };
        } catch (error) {
            logger.error('Failed to render template', {
                templateCode,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    /**
     * Replace {{variable}} placeholders with actual values
     * Supports nested object access via dot notation
     * 
     * @param template - Template string with {{placeholders}}
     * @param variables - Object containing values
     * @returns Rendered string
     */
    private replaceVariables(
        template: string,
        variables: Record<string, any>
    ): string {
        return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
            // Support dot notation for nested objects
            const value = key.split('.').reduce((obj: any, k: string) => {
                return obj?.[k];
            }, variables);

            return value !== undefined && value !== null ? String(value) : match;
        });
    }

    /**
     * Get all templates (admin use)
     */
    async getAllTemplates(filters?: {
        category?: string;
        isActive?: boolean;
    }) {
        const conditions = [];

        if (filters?.category) {
            conditions.push(eq(notificationTemplates.category, filters.category));
        }

        if (filters?.isActive !== undefined) {
            conditions.push(eq(notificationTemplates.is_active, filters.isActive));
        }

        return await db
            .select()
            .from(notificationTemplates)
            .where(conditions.length > 0 ? conditions[0] : undefined);
    }

    /**
     * Get single template by code
     */
    async getTemplateByCode(code: string) {
        const [template] = await db
            .select()
            .from(notificationTemplates)
            .where(eq(notificationTemplates.code, code))
            .limit(1);

        return template || null;
    }

    /**
     * Create or update template (admin use)
     */
    async upsertTemplate(data: {
        code: string;
        name: string;
        description?: string;
        category?: string;
        subject?: string;
        body_text?: string;
        body_html?: string;
        sms_template?: string;
        in_app_title?: string;
        in_app_message?: string;
        variables?: string[];
        is_active?: boolean;
    }) {
        const [result] = await db
            .insert(notificationTemplates)
            .values({
                ...data,
                variables: data.variables || [],
            })
            .onConflictDoUpdate({
                target: notificationTemplates.code,
                set: {
                    ...data,
                    variables: data.variables || [],
                    updated_at: new Date(),
                },
            })
            .returning();

        logger.info('Template upserted', { code: data.code });
        return result;
    }

    /**
     * Validate template variables
     * Checks if all required variables are provided
     */
    validateVariables(
        template: { variables: string[] | null },
        providedVariables: Record<string, any>
    ): { valid: boolean; missing: string[] } {
        const required = template.variables || [];
        const provided = Object.keys(providedVariables);
        const missing = required.filter(v => !provided.includes(v));

        return {
            valid: missing.length === 0,
            missing,
        };
    }
}

export const templateService = new TemplateService();
