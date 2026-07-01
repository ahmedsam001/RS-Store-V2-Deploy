import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapCategory, mapFeaturedSubCategory } from '../src/modules/catalog/mappers/catalog.mapper';

describe('catalog mapper - subcategory image', () => {
  it('mapFeaturedSubCategory returns image from category', () => {
    const category = {
      id: 'sub-1',
      nameAr: 'Test Subcategory',
      nameEn: 'Test Sub',
      slug: 'test-sub',
      image: 'https://example.com/image.jpg',
      _count: { subCategoryProducts: 5 },
      parent: { slug: 'parent-cat', nameAr: 'Parent' },
    } as any;

    const result = mapFeaturedSubCategory(category);
    assert.equal(result.image, 'https://example.com/image.jpg');
    assert.equal(result.productsCount, 5);
  });

  it('mapCategory subCategories items include image field', () => {
    const category = {
      id: 'cat-1',
      slug: 'parent-cat',
      nameAr: 'Parent Category',
      description: null,
      image: null,
      parent: null,
    } as any;

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
