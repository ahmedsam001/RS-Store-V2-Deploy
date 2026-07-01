import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { ImageUploadGallery } from '@/features/admin/components/ImageUploadGallery';
import { SheinPreviewPayload, AdminCategory } from '@/features/admin/api/admin-api';
import { clampNumber, formatNumberForInput } from '@/features/admin/shein/utils/shein-review-utils';
import { EditableOptionList } from './EditableOptionList';
import { Notice } from '../types/shein.types';

export function SheinEditorForm({
  payload,
  categories,
  canEdit,
  selectedCategory,
  subCategories,
  hasStaticSubCategoryOptions,
  sarExchangeRate,
  calculatedStorePrice,
  onUpdate,
  onUpdateMainCategory,
  onUpdateOptionList,
  onImagesChange,
  onNoticeChange,
}: {
  payload: SheinPreviewPayload;
  categories: AdminCategory[];
  canEdit: boolean;
  selectedCategory: AdminCategory | undefined;
  subCategories: string[];
  hasStaticSubCategoryOptions: boolean;
  sarExchangeRate: number;
  calculatedStorePrice: string;
  onUpdate: (key: keyof SheinPreviewPayload, value: string | number | undefined) => void;
  onUpdateMainCategory: (categoryId: string) => void;
  onUpdateOptionList: (key: 'sizes' | 'colors', values: string[]) => void;
  onImagesChange: (images: SheinPreviewPayload['images']) => void;
  onNoticeChange: (notice: Notice) => void;
}) {
  return (
    <>
      <div className="admin-shein-form-grid">
        <label>
          <span>Product Name</span>
          <Input
            value={payload.nameAr}
            onChange={(e) => onUpdate('nameAr', e.target.value)}
            placeholder="Product name"
            disabled={!canEdit}
          />
        </label>
        <label>
          <span>Main Category</span>
          <Select
            value={selectedCategory?.id ?? payload.categoryId ?? ''}
            onChange={(e) => onUpdateMainCategory(e.target.value)}
            disabled={!canEdit}
          >
            <option value="">Select main category</option>
            {categories
              .filter((category) => category.isActive)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nameEn || category.nameAr}
                </option>
              ))}
          </Select>
        </label>
        <label>
          <span>Sub Category</span>
          {hasStaticSubCategoryOptions ? (
            <Select
              value={payload.subCategory ?? ''}
              onChange={(e) => onUpdate('subCategory', e.target.value)}
              disabled={!canEdit || !selectedCategory?.slug}
            >
              <option value="">Select sub category</option>
              {subCategories.map((subCategory) => (
                <option key={subCategory} value={subCategory}>
                  {subCategory}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={payload.subCategory ?? ''}
              onChange={(e) => onUpdate('subCategory', e.target.value)}
              placeholder="Select sub category"
              disabled={!canEdit || !payload.categoryId}
            />
          )}
        </label>
        <label>
          <span>Original Price SAR</span>
          <Input
            value={payload.priceAmount}
            onChange={(e) => onUpdate('priceAmount', e.target.value)}
            placeholder="SHEIN price in SAR"
            dir="ltr"
            disabled={!canEdit}
          />
        </label>
        <label>
          <span>Exchange Rate</span>
          <Input value={formatNumberForInput(sarExchangeRate)} dir="ltr" disabled />
        </label>
        <label>
          <span>Calculated Store Price</span>
          <Input
            value={calculatedStorePrice ? `${calculatedStorePrice} EGP` : ''}
            dir="ltr"
            disabled
          />
        </label>
        <label>
          <span>Discount</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={payload.discount ?? 0}
            onChange={(e) => onUpdate('discount', clampNumber(e.target.value, 0, 100))}
            dir="ltr"
            disabled={!canEdit}
          />
        </label>
        <label>
          <span>Rating</span>
          <Input
            type="number"
            min={0}
            max={5}
            step="0.1"
            value={payload.rating ?? 0}
            onChange={(e) => onUpdate('rating', clampNumber(e.target.value, 0, 5))}
            dir="ltr"
            disabled={!canEdit}
          />
        </label>
      </div>

      <label className="admin-shein-field-block">
        <span>Original / Edited Description</span>
        <textarea
          value={payload.description ?? ''}
          onChange={(e) => onUpdate('description', e.target.value)}
          className="admin-shein-textarea"
          placeholder="You can edit or replace SHEIN description before publishing"
          disabled={!canEdit}
        />
      </label>

      <ImageUploadGallery
        images={payload.images}
        altText={payload.nameAr}
        disabled={!canEdit}
        onChange={onImagesChange}
        onNotice={onNoticeChange}
      />

      <section className="space-y-3">
        <div className="admin-shein-section-title">
          <h3>Colors</h3>
          <small>Colors extracted automatically and can be added, edited, deleted, or reordered</small>
        </div>
        <EditableOptionList
          values={payload.colors ?? []}
          addLabel="Add Color"
          placeholder="Color name"
          disabled={!canEdit}
          canReorder
          onChange={(nextValues) => onUpdateOptionList('colors', nextValues)}
        />
      </section>

      <section className="space-y-3">
        <div className="admin-shein-section-title">
          <h3>Sizes</h3>
          <small>Sizes extracted automatically and can be added, edited, deleted, or reordered</small>
        </div>
        <EditableOptionList
          values={payload.sizes ?? []}
          addLabel="Add Size"
          placeholder="Size"
          disabled={!canEdit}
          canReorder
          onChange={(nextValues) => onUpdateOptionList('sizes', nextValues)}
        />
      </section>
    </>
  );
}