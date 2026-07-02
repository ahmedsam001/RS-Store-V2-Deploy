import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapCategory, mapFeaturedSubCategory } from '../src/modules/catalog/mappers/catalog.mapper';

type FeaturedCategoryInput = Parameters<typeof mapFeaturedSubCategory>[0];
type CategoryInput = Parameters<typeof mapCategory>[0];

const now = new Date('2025-01-01T00:00:00.000Z');

function categoryStub(overrides: Partial<CategoryInput> = {}): CategoryInput {
  return {
    id: 'cat-1',
    slug: 'category',
    nameAr: 'Category',
    nameEn: null,
    description: null,
    image: null,
    sortOrder: 0,
    isActive: true,
    parentId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    parent: null,
    ...overrides,
  };
}

describe('catalog mapper - subcategory image', () => {
  it('mapFeaturedSubCategory returns image from category', () => {
    const parent = categoryStub({
      id: 'parent-1',
      slug: 'parent-cat',
      nameAr: 'Parent',
    }) as FeaturedCategoryInput['parent'];

    const category: FeaturedCategoryInput = {
      ...categoryStub({
        id: 'sub-1',
        nameAr: 'Test Subcategory',
        nameEn: 'Test Sub',
        slug: 'test-sub',
        image: 'https://example.com/image.jpg',
      }),
      _count: { subCategoryProducts: 5 },
      parent,
    };

    const result = mapFeaturedSubCategory(category);
    assert.equal(result.image, 'https://example.com/image.jpg');
    assert.equal(result.productsCount, 5);
  });

  it('mapCategory subCategories items include image field', () => {
    const category = categoryStub({
      id: 'cat-1',
      slug: 'parent-cat',
      nameAr: 'Parent Category',
      description: null,
      image: null,
      parent: null,
    });

    const subCategoryItems = [
      {
        id: 'sub-1',
        slug: 'sub-1',
        name: 'Sub 1',
        nameAr: 'Sub 1',
        nameEn: 'Sub One',
        count: 3,
        image: 'https://example.com/sub1.jpg',
      },
      {
        id: 'sub-2',
        slug: 'sub-2',
        name: 'Sub 2',
        nameAr: 'Sub 2',
        nameEn: null,
        count: 7,
        image: null,
      },
    ];

    const result = mapCategory(category, 10, subCategoryItems);
    assert.equal(result.subCategories?.[0].image, 'https://example.com/sub1.jpg');
    assert.equal(result.subCategories?.[0].nameAr, 'Sub 1');
    assert.equal(result.subCategories?.[0].nameEn, 'Sub One');
    assert.equal(result.subCategories?.[1].image, null);
  });
});
