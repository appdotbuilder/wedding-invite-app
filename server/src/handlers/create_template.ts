import { db } from '../db';
import { templatesTable } from '../db/schema';
import { type CreateTemplateInput, type Template } from '../schema';

export const createTemplate = async (input: CreateTemplateInput): Promise<Template> => {
  try {
    // Validate JSON structure of template_data
    try {
      JSON.parse(input.template_data);
    } catch (error) {
      throw new Error('Invalid template_data: must be valid JSON string');
    }

    // Insert template record
    const result = await db.insert(templatesTable)
      .values({
        name: input.name,
        category: input.category,
        thumbnail_url: input.thumbnail_url,
        preview_url: input.preview_url,
        template_data: input.template_data,
        is_active: true // Default value as per schema
      })
      .returning()
      .execute();

    const template = result[0];
    return template;
  } catch (error) {
    console.error('Template creation failed:', error);
    throw error;
  }
};