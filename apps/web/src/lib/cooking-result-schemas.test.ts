import { cookingResultFormSchema, OUTCOME_TAGS, REACTION_CONFIG } from './cooking-result-schemas';

describe('Cooking Result Form Validation Schemas', () => {
  const validData = {
    mediaUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624',
    caption: 'Cooked in electric kettle with amul cheese',
    notes: 'Stirred constantly to avoid sticking to heating element.',
    outcomeTag: 'perfection' as const,
    tasteRating: 5,
    textureRating: 4,
    wouldMakeAgain: true,
    modificationsMade: 'Added extra garlic and halved the water',
  };

  it('should accept valid cooking result form data', () => {
    const res = cookingResultFormSchema.safeParse(validData);
    expect(res.success).toBe(true);
  });

  it('should reject invalid media URL', () => {
    const invalid = {
      ...validData,
      mediaUrl: 'not-a-valid-url',
    };
    const res = cookingResultFormSchema.safeParse(invalid);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain('valid HTTP or HTTPS URL');
    }
  });

  it('should reject non-http/https URL schemes such as javascript:, data:, or ftp:', () => {
    expect(
      cookingResultFormSchema.safeParse({
        ...validData,
        mediaUrl: 'javascript:alert(1)',
      }).success,
    ).toBe(false);

    expect(
      cookingResultFormSchema.safeParse({
        ...validData,
        mediaUrl: 'data:text/html,<script>alert(1)</script>',
      }).success,
    ).toBe(false);

    expect(
      cookingResultFormSchema.safeParse({
        ...validData,
        mediaUrl: 'ftp://cdn.wierd.food/file.jpg',
      }).success,
    ).toBe(false);
  });

  it('should reject empty media URL', () => {
    const invalid = {
      ...validData,
      mediaUrl: '',
    };
    const res = cookingResultFormSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('should reject taste rating less than 1 or greater than 5', () => {
    const tooLow = {
      ...validData,
      tasteRating: 0,
    };
    expect(cookingResultFormSchema.safeParse(tooLow).success).toBe(false);

    const tooHigh = {
      ...validData,
      tasteRating: 6,
    };
    expect(cookingResultFormSchema.safeParse(tooHigh).success).toBe(false);
  });

  it('should validate all 8 supported outcome tags', () => {
    expect(OUTCOME_TAGS.length).toBe(8);

    for (const item of OUTCOME_TAGS) {
      const res = cookingResultFormSchema.safeParse({
        ...validData,
        outcomeTag: item.tag,
      });
      expect(res.success).toBe(true);
    }
  });

  it('should reject unsupported outcome tags', () => {
    const invalid = {
      ...validData,
      outcomeTag: 'invalid_tag',
    };
    expect(cookingResultFormSchema.safeParse(invalid).success).toBe(false);
  });

  it('should support all 5 reaction types in REACTION_CONFIG', () => {
    expect(Object.keys(REACTION_CONFIG)).toEqual([
      'fire',
      'yuck',
      'respect',
      'laugh',
      'mind_blown',
    ]);
  });
});
