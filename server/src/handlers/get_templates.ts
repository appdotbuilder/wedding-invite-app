import { db } from '../db';
import { templatesTable } from '../db/schema';
import { type Template, type TemplateCategory } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export async function getTemplates(): Promise<Template[]> {
  try {
    const results = await db.select()
      .from(templatesTable)
      .where(eq(templatesTable.is_active, true))
      .orderBy(desc(templatesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    throw error;
  }
}

export async function getTemplatesByCategory(category: string): Promise<Template[]> {
  try {
    // Validate category is one of the allowed values
    const validCategories = ['romantic', 'contemporary', 'formal', 'traditional'] as const;
    if (!validCategories.includes(category as any)) {
      throw new Error(`Invalid category: ${category}. Must be one of: ${validCategories.join(', ')}`);
    }

    const results = await db.select()
      .from(templatesTable)
      .where(
        and(
          eq(templatesTable.category, category as 'romantic' | 'contemporary' | 'formal' | 'traditional'),
          eq(templatesTable.is_active, true)
        )
      )
      .orderBy(desc(templatesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch templates by category:', error);
    throw error;
  }
}

export async function getTemplateById(id: number): Promise<Template | null> {
  try {
    const results = await db.select()
      .from(templatesTable)
      .where(eq(templatesTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch template by ID:', error);
    throw error;
  }
}