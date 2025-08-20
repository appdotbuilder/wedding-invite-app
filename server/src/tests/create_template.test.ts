import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { templatesTable } from '../db/schema';
import { type CreateTemplateInput } from '../schema';
import { createTemplate } from '../handlers/create_template';
import { eq } from 'drizzle-orm';

// Valid test input with proper JSON template data
const testTemplateData = JSON.stringify({
  layout: 'classic',
  colors: { primary: '#B8860B', secondary: '#FFF8DC' },
  fonts: { heading: 'Playfair Display', body: 'Crimson Text' },
  sections: ['hero', 'story', 'details', 'gallery', 'rsvp']
});

const testInput: CreateTemplateInput = {
  name: 'Elegant Wedding Template',
  category: 'romantic',
  thumbnail_url: 'https://example.com/thumbnails/elegant-wedding.jpg',
  preview_url: 'https://example.com/previews/elegant-wedding.html',
  template_data: testTemplateData
};

describe('createTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a template with valid data', async () => {
    const result = await createTemplate(testInput);

    // Verify all fields are correctly set
    expect(result.name).toEqual('Elegant Wedding Template');
    expect(result.category).toEqual('romantic');
    expect(result.thumbnail_url).toEqual(testInput.thumbnail_url);
    expect(result.preview_url).toEqual(testInput.preview_url);
    expect(result.template_data).toEqual(testTemplateData);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save template to database', async () => {
    const result = await createTemplate(testInput);

    // Query the database to verify the record was saved
    const templates = await db.select()
      .from(templatesTable)
      .where(eq(templatesTable.id, result.id))
      .execute();

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toEqual('Elegant Wedding Template');
    expect(templates[0].category).toEqual('romantic');
    expect(templates[0].template_data).toEqual(testTemplateData);
    expect(templates[0].is_active).toBe(true);
    expect(templates[0].created_at).toBeInstanceOf(Date);
    expect(templates[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create templates with different categories', async () => {
    const contemporaryTemplate: CreateTemplateInput = {
      ...testInput,
      name: 'Modern Wedding Template',
      category: 'contemporary',
      template_data: JSON.stringify({ layout: 'modern', style: 'minimalist' })
    };

    const formalTemplate: CreateTemplateInput = {
      ...testInput,
      name: 'Classic Wedding Template',
      category: 'formal',
      template_data: JSON.stringify({ layout: 'traditional', style: 'elegant' })
    };

    const result1 = await createTemplate(contemporaryTemplate);
    const result2 = await createTemplate(formalTemplate);

    expect(result1.category).toEqual('contemporary');
    expect(result1.name).toEqual('Modern Wedding Template');
    expect(result2.category).toEqual('formal');
    expect(result2.name).toEqual('Classic Wedding Template');

    // Verify both are saved in database
    const allTemplates = await db.select()
      .from(templatesTable)
      .execute();

    expect(allTemplates).toHaveLength(2);
  });

  it('should handle complex template data structures', async () => {
    const complexTemplateData = JSON.stringify({
      layout: {
        type: 'multi-page',
        pages: ['cover', 'story', 'gallery', 'details', 'rsvp', 'thanks']
      },
      design: {
        theme: 'floral',
        colors: {
          primary: '#2C5F41',
          secondary: '#97BC62',
          accent: '#D4A574',
          background: '#F5F5DC'
        },
        typography: {
          headings: { font: 'Playfair Display', weight: 'bold' },
          body: { font: 'Open Sans', weight: 'regular' },
          script: { font: 'Dancing Script', weight: 'regular' }
        }
      },
      components: {
        countdown: { enabled: true, position: 'header' },
        music: { enabled: true, autoplay: false },
        gallery: { style: 'masonry', columns: 3 },
        rsvp: { fields: ['name', 'email', 'attendance', 'guests', 'dietary'] }
      },
      animations: {
        entrance: 'fade-in',
        transitions: 'slide',
        duration: 0.5
      }
    });

    const complexInput: CreateTemplateInput = {
      ...testInput,
      name: 'Premium Floral Template',
      template_data: complexTemplateData
    };

    const result = await createTemplate(complexInput);

    expect(result.template_data).toEqual(complexTemplateData);
    
    // Verify the JSON can be parsed back correctly
    const parsedData = JSON.parse(result.template_data);
    expect(parsedData.layout.type).toEqual('multi-page');
    expect(parsedData.design.colors.primary).toEqual('#2C5F41');
    expect(parsedData.components.gallery.style).toEqual('masonry');
  });

  it('should reject invalid JSON in template_data', async () => {
    const invalidInput: CreateTemplateInput = {
      ...testInput,
      template_data: '{ invalid json: missing quotes }'
    };

    await expect(createTemplate(invalidInput)).rejects.toThrow(/Invalid template_data.*valid JSON/i);
  });

  it('should reject malformed JSON strings', async () => {
    const malformedInputs = [
      { ...testInput, template_data: '{ "incomplete": ' },
      { ...testInput, template_data: '{ "trailing": "comma", }' },
      { ...testInput, template_data: 'not json at all' },
      { ...testInput, template_data: '{ "unescaped": "quote"s" }' }
    ];

    for (const input of malformedInputs) {
      await expect(createTemplate(input)).rejects.toThrow(/Invalid template_data.*valid JSON/i);
    }
  });

  it('should handle empty but valid JSON objects', async () => {
    const emptyJsonInput: CreateTemplateInput = {
      ...testInput,
      name: 'Minimal Template',
      template_data: '{}'
    };

    const result = await createTemplate(emptyJsonInput);

    expect(result.template_data).toEqual('{}');
    expect(result.name).toEqual('Minimal Template');
    
    // Verify it can be parsed
    const parsed = JSON.parse(result.template_data);
    expect(typeof parsed).toBe('object');
    expect(Object.keys(parsed)).toHaveLength(0);
  });
});