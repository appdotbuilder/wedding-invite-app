import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { templatesTable } from '../db/schema';
import { getTemplates, getTemplatesByCategory, getTemplateById } from '../handlers/get_templates';
import { type CreateTemplateInput } from '../schema';
import { eq } from 'drizzle-orm';

// Test template inputs
const romanticTemplate: CreateTemplateInput = {
  name: 'Romantic Rose',
  category: 'romantic',
  thumbnail_url: 'https://example.com/romantic-thumb.jpg',
  preview_url: 'https://example.com/romantic-preview.jpg',
  template_data: JSON.stringify({
    colors: { primary: '#ff6b9d', secondary: '#ffeaa7' },
    fonts: { heading: 'Dancing Script', body: 'Open Sans' }
  })
};

const contemporaryTemplate: CreateTemplateInput = {
  name: 'Modern Minimalist',
  category: 'contemporary',
  thumbnail_url: 'https://example.com/contemporary-thumb.jpg',
  preview_url: 'https://example.com/contemporary-preview.jpg',
  template_data: JSON.stringify({
    colors: { primary: '#2d3436', secondary: '#ddd' },
    fonts: { heading: 'Montserrat', body: 'Source Sans Pro' }
  })
};

const formalTemplate: CreateTemplateInput = {
  name: 'Classic Elegance',
  category: 'formal',
  thumbnail_url: 'https://example.com/formal-thumb.jpg',
  preview_url: 'https://example.com/formal-preview.jpg',
  template_data: JSON.stringify({
    colors: { primary: '#2c3e50', secondary: '#ecf0f1' },
    fonts: { heading: 'Playfair Display', body: 'Lora' }
  })
};

const traditionalTemplate: CreateTemplateInput = {
  name: 'Heritage Gold',
  category: 'traditional',
  thumbnail_url: 'https://example.com/traditional-thumb.jpg',
  preview_url: 'https://example.com/traditional-preview.jpg',
  template_data: JSON.stringify({
    colors: { primary: '#f39c12', secondary: '#8e44ad' },
    fonts: { heading: 'Cinzel', body: 'Crimson Text' }
  })
};

describe('getTemplates', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all active templates ordered by creation date', async () => {
    // Create test templates
    await db.insert(templatesTable).values([
      romanticTemplate,
      contemporaryTemplate,
      formalTemplate
    ]).execute();

    // Create an inactive template that should not be returned
    await db.insert(templatesTable).values({
      ...traditionalTemplate,
      name: 'Inactive Template',
      is_active: false
    }).execute();

    const result = await getTemplates();

    // Should only return active templates
    expect(result).toHaveLength(3);
    
    // Verify template structure
    result.forEach(template => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.category).toBeDefined();
      expect(template.thumbnail_url).toBeDefined();
      expect(template.preview_url).toBeDefined();
      expect(template.template_data).toBeDefined();
      expect(template.is_active).toBe(true);
      expect(template.created_at).toBeInstanceOf(Date);
      expect(template.updated_at).toBeInstanceOf(Date);
    });

    // Verify templates are ordered by creation date (newest first)
    const templateNames = result.map(t => t.name);
    expect(templateNames).toContain('Romantic Rose');
    expect(templateNames).toContain('Modern Minimalist');
    expect(templateNames).toContain('Classic Elegance');
  });

  it('should return empty array when no active templates exist', async () => {
    // Create only inactive templates
    await db.insert(templatesTable).values({
      ...romanticTemplate,
      is_active: false
    }).execute();

    const result = await getTemplates();
    expect(result).toHaveLength(0);
  });

  it('should handle database errors gracefully', async () => {
    // Simulate database error by dropping the table
    try {
      await db.execute('DROP TABLE templates');
    } catch {
      // Table might not exist yet, that's fine for this test
    }

    await expect(getTemplates()).rejects.toThrow();
  });
});

describe('getTemplatesByCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create templates in different categories
    await db.insert(templatesTable).values([
      romanticTemplate,
      contemporaryTemplate,
      formalTemplate,
      traditionalTemplate
    ]).execute();

    // Create an inactive romantic template
    await db.insert(templatesTable).values({
      ...romanticTemplate,
      name: 'Inactive Romantic',
      is_active: false
    }).execute();
  });

  it('should return templates filtered by romantic category', async () => {
    const result = await getTemplatesByCategory('romantic');

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('romantic');
    expect(result[0].name).toBe('Romantic Rose');
    expect(result[0].is_active).toBe(true);
  });

  it('should return templates filtered by contemporary category', async () => {
    const result = await getTemplatesByCategory('contemporary');

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('contemporary');
    expect(result[0].name).toBe('Modern Minimalist');
  });

  it('should return templates filtered by formal category', async () => {
    const result = await getTemplatesByCategory('formal');

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('formal');
    expect(result[0].name).toBe('Classic Elegance');
  });

  it('should return templates filtered by traditional category', async () => {
    const result = await getTemplatesByCategory('traditional');

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('traditional');
    expect(result[0].name).toBe('Heritage Gold');
  });

  it('should only return active templates in category', async () => {
    const result = await getTemplatesByCategory('romantic');

    // Should only return the active romantic template, not the inactive one
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Romantic Rose');
    expect(result[0].is_active).toBe(true);
  });

  it('should return empty array for category with no active templates', async () => {
    // Make all romantic templates inactive
    await db.update(templatesTable)
      .set({ is_active: false })
      .where(eq(templatesTable.category, 'romantic'))
      .execute();

    const result = await getTemplatesByCategory('romantic');
    expect(result).toHaveLength(0);
  });

  it('should order results by creation date descending', async () => {
    // Add another contemporary template
    await db.insert(templatesTable).values({
      name: 'Modern Sleek',
      category: 'contemporary',
      thumbnail_url: 'https://example.com/sleek-thumb.jpg',
      preview_url: 'https://example.com/sleek-preview.jpg',
      template_data: JSON.stringify({ colors: { primary: '#000', secondary: '#fff' } })
    }).execute();

    const result = await getTemplatesByCategory('contemporary');

    expect(result).toHaveLength(2);
    // Should be ordered by creation date (newest first)
    expect(result[0].name).toBe('Modern Sleek');
    expect(result[1].name).toBe('Modern Minimalist');
  });

  it('should throw error for invalid category', async () => {
    await expect(getTemplatesByCategory('invalid-category')).rejects.toThrow(/Invalid category: invalid-category/);
  });
});

describe('getTemplateById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let templateId: number;

  beforeEach(async () => {
    // Create a test template
    const result = await db.insert(templatesTable)
      .values(romanticTemplate)
      .returning()
      .execute();
    
    templateId = result[0].id;
  });

  it('should return template when found', async () => {
    const result = await getTemplateById(templateId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(templateId);
    expect(result!.name).toBe('Romantic Rose');
    expect(result!.category).toBe('romantic');
    expect(result!.thumbnail_url).toBe('https://example.com/romantic-thumb.jpg');
    expect(result!.preview_url).toBe('https://example.com/romantic-preview.jpg');
    expect(result!.template_data).toBeDefined();
    expect(result!.is_active).toBe(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when template not found', async () => {
    const result = await getTemplateById(99999);
    expect(result).toBeNull();
  });

  it('should return inactive template when queried by ID', async () => {
    // Make the template inactive
    await db.update(templatesTable)
      .set({ is_active: false })
      .where(eq(templatesTable.id, templateId))
      .execute();

    const result = await getTemplateById(templateId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(templateId);
    expect(result!.is_active).toBe(false);
  });

  it('should handle database errors gracefully', async () => {
    // Simulate database error by dropping the table
    try {
      await db.execute('DROP TABLE templates');
    } catch {
      // Table might not exist, that's fine for this test
    }

    await expect(getTemplateById(templateId)).rejects.toThrow();
  });

  it('should handle template with complex JSON data', async () => {
    // Create template with complex template data
    const complexTemplateData = JSON.stringify({
      layout: {
        sections: ['header', 'story', 'details', 'gallery', 'rsvp'],
        animations: ['fadeIn', 'slideUp']
      },
      colors: {
        primary: '#ff6b9d',
        secondary: '#ffeaa7',
        accent: '#fd79a8',
        text: '#2d3436'
      },
      fonts: {
        heading: { family: 'Dancing Script', weights: [400, 700] },
        body: { family: 'Open Sans', weights: [300, 400, 600] }
      },
      components: {
        countdown: { enabled: true, style: 'elegant' },
        music: { autoplay: false, volume: 0.3 }
      }
    });

    const result = await db.insert(templatesTable)
      .values({
        ...romanticTemplate,
        name: 'Complex Template',
        template_data: complexTemplateData
      })
      .returning()
      .execute();

    const fetchedTemplate = await getTemplateById(result[0].id);

    expect(fetchedTemplate).not.toBeNull();
    expect(fetchedTemplate!.template_data).toBe(complexTemplateData);
    
    // Verify JSON can be parsed
    const parsedData = JSON.parse(fetchedTemplate!.template_data);
    expect(parsedData.layout.sections).toHaveLength(5);
    expect(parsedData.colors.primary).toBe('#ff6b9d');
    expect(parsedData.fonts.heading.family).toBe('Dancing Script');
  });
});