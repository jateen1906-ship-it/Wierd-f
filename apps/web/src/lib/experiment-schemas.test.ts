import {
  createExperimentFormSchema,
  remixExperimentFormSchema,
  ingredientFormSchema,
  preparationStepFormSchema,
  costEstimateFormSchema,
  transformationFormSchema,
} from './experiment-schemas';

describe('Experiment & Remix Validation Schemas', () => {
  describe('ingredientFormSchema', () => {
    it('should validate a valid ingredient with canonical ID', () => {
      const valid = {
        name: 'Instant Noodles',
        quantity: 2,
        unit: 'packet',
        preparation: 'crushed lightly',
        canonicalId: '123e4567-e89b-12d3-a456-426614174000',
        isOptional: false,
        isCustomAddition: false,
      };
      const res = ingredientFormSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('should validate a custom ingredient with empty canonical ID', () => {
      const validCustom = {
        name: 'Amul Cheese Cube',
        quantity: 1,
        unit: 'piece',
        canonicalId: '',
        isOptional: true,
        isCustomAddition: true,
      };
      const res = ingredientFormSchema.safeParse(validCustom);
      expect(res.success).toBe(true);
    });

    it('should reject non-positive quantity', () => {
      const invalid = {
        name: 'Butter',
        quantity: 0,
        unit: 'tbsp',
      };
      const res = ingredientFormSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('Quantity must be greater than 0');
      }
    });

    it('should reject empty name', () => {
      const invalid = {
        name: '',
        quantity: 1,
        unit: 'piece',
      };
      const res = ingredientFormSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('Ingredient name is required');
      }
    });
  });

  describe('preparationStepFormSchema', () => {
    it('should validate a compliant preparation step', () => {
      const valid = {
        stepNumber: 1,
        instruction: 'Boil water in electric kettle until vigorous bubbling occurs',
        durationMinutes: 4,
        safetyTip: 'Do not touch metallic kettle base',
        isCritical: true,
      };
      const res = preparationStepFormSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('should reject instruction shorter than 3 characters', () => {
      const invalid = {
        stepNumber: 1,
        instruction: 'No',
      };
      const res = preparationStepFormSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('Instruction must be at least 3 characters');
      }
    });

    it('should reject negative duration', () => {
      const invalid = {
        stepNumber: 1,
        instruction: 'Stir vigorously',
        durationMinutes: -2,
      };
      const res = preparationStepFormSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('Duration cannot be negative');
      }
    });
  });

  describe('costEstimateFormSchema', () => {
    it('should accept valid cost range where max >= min', () => {
      const res = costEstimateFormSchema.safeParse({
        min: 25,
        max: 50,
        currency: 'INR',
      });
      expect(res.success).toBe(true);
    });

    it('should accept equal min and max', () => {
      const res = costEstimateFormSchema.safeParse({
        min: 40,
        max: 40,
        currency: 'INR',
      });
      expect(res.success).toBe(true);
    });

    it('should reject if max < min', () => {
      const res = costEstimateFormSchema.safeParse({
        min: 100,
        max: 30,
        currency: 'INR',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('Maximum cost must be greater than or equal');
      }
    });

    it('should reject negative costs', () => {
      const res = costEstimateFormSchema.safeParse({
        min: -10,
        max: 30,
        currency: 'INR',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('transformationFormSchema', () => {
    it('should validate a supported transformation diff', () => {
      const res = transformationFormSchema.safeParse({
        type: 'ingredient_substituted',
        description: 'Swapped water for milk for creamy broth',
        previousValue: '200ml water',
        newValue: '200ml milk',
      });
      expect(res.success).toBe(true);
    });

    it('should reject unsupported transformation types', () => {
      const res = transformationFormSchema.safeParse({
        type: 'invalid_type',
        description: 'Invalid',
      });
      expect(res.success).toBe(false);
    });

    it('should reject empty description', () => {
      const res = transformationFormSchema.safeParse({
        type: 'ingredient_added',
        description: '',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('createExperimentFormSchema', () => {
    const validExperiment = {
      title: 'Hostel Kettle Cheesy Maggi',
      description:
        'The definitive midnight survival staple made inside a standard hostel electric kettle.',
      difficulty: 'easy' as const,
      estimatedTimeMinutes: 10,
      estimatedCost: {
        min: 30,
        max: 60,
        currency: 'INR' as const,
      },
      ingredients: [
        {
          name: 'Maggi Noodles',
          quantity: 1,
          unit: 'packet',
          preparation: 'broken in half',
          isOptional: false,
          isCustomAddition: false,
        },
      ],
      steps: [
        {
          stepNumber: 1,
          instruction: 'Boil water in electric kettle',
          durationMinutes: 3,
          isCritical: false,
        },
      ],
    };

    it('should validate a complete compliant experiment', () => {
      const res = createExperimentFormSchema.safeParse(validExperiment);
      expect(res.success).toBe(true);
    });

    it('should reject experiment title shorter than 3 characters', () => {
      const res = createExperimentFormSchema.safeParse({
        ...validExperiment,
        title: 'Hi',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('Title must be at least 3 characters');
      }
    });

    it('should reject empty ingredients list', () => {
      const res = createExperimentFormSchema.safeParse({
        ...validExperiment,
        ingredients: [],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('At least 1 ingredient is required');
      }
    });

    it('should reject empty steps list', () => {
      const res = createExperimentFormSchema.safeParse({
        ...validExperiment,
        steps: [],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('At least 1 preparation step is required');
      }
    });
  });

  describe('remixExperimentFormSchema', () => {
    const validRemix = {
      title: '[Remix] Kettle Cheesy Garlic Butter Maggi',
      description: 'Elevated variant using roasted garlic butter instead of plain oil.',
      difficulty: 'medium' as const,
      estimatedTimeMinutes: 12,
      estimatedCost: {
        min: 45,
        max: 75,
        currency: 'INR' as const,
      },
      transformations: [
        {
          type: 'ingredient_added' as const,
          description: 'Added crushed garlic fried in amul butter',
          newValue: '1 tbsp garlic butter',
        },
      ],
      ingredients: [
        {
          name: 'Maggi Noodles',
          quantity: 1,
          unit: 'packet',
          isOptional: false,
          isCustomAddition: false,
        },
      ],
      steps: [
        {
          stepNumber: 1,
          instruction: 'Melt butter and fry garlic before boiling noodles',
          durationMinutes: 3,
          isCritical: true,
        },
      ],
    };

    it('should validate a complete compliant remix with transformations', () => {
      const res = remixExperimentFormSchema.safeParse(validRemix);
      expect(res.success).toBe(true);
    });

    it('should strictly reject remix without any transformations', () => {
      const res = remixExperimentFormSchema.safeParse({
        ...validRemix,
        transformations: [],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain(
          'At least 1 transformation diff is required when remixing an experiment',
        );
      }
    });
  });
});
