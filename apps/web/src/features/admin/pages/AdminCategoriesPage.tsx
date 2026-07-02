import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ImagePlus, Plus, UploadCloud } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { toUserMessage } from '@/shared/api/api-error';
import { useAuth } from '@/features/auth/AuthContext';
import { adminApi, AdminCategory, AdminSubcategoryInput } from '@/features/admin/api/admin-api';
import {
  AdminCard,
  AdminPageHeader,
  AdminStatusBadge,
} from '@/features/admin/components/AdminDesign';
import { AdminEmpty, AdminError, AdminLoading } from '@/features/admin/components/AdminState';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';

export function AdminCategoriesPage() {
  const { csrfToken } = useAuth();
  const [items, setItems] = useState<AdminCategory[] | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newCategoryImageKey, setNewCategoryImageKey] = useState(0);

  async function load() {
    const response = await adminApi.categories();
    setItems(response);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  async function run(action: () => Promise<unknown>, success: string): Promise<boolean> {
    try {
      setError(null);
      setMessage(null);
      await action();
      setMessage(success);
      await load();
      return true;
    } catch (err) {
      setError(toUserMessage(err, 'An error occurred'));
      return false;
    }
  }

  if (error && !items)
    return (
      <AdminError
        message={error}
        onRetry={() => load().catch((err: Error) => setError(err.message))}
      />
    );
  if (!items) return <AdminLoading />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Categories"
        title="Manage Categories"
        description="Add and edit main categories and subcategories"
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void run(async () => undefined, 'Categories refreshed');
            }}
          >
            Refresh
          </Button>
        }
      />
      <Feedback error={error} message={message} />

      <AdminCard
        title="Add New Category"
        description="Any active category saved here will appear in the main menu and categories page for customers"
      >
        <form
          className="admin-form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const input = readCategoryForm(form);
            void run(() => adminApi.createCategory(input, { csrfToken }), 'Category added').then(
              (didSave) => {
                if (!didSave) return;
                form.reset();
                setNewCategoryImageKey((key) => key + 1);
              },
            );
          }}
        >
          <Input name="nameAr" placeholder="Category name" required />
          <Input name="nameEn" placeholder="English name" />
          <Input name="slug" dir="ltr" placeholder="category-slug" required />
          <Input name="sortOrder" type="number" placeholder="Sort order" />
          <AdminSingleImageUploader
            key={newCategoryImageKey}
            name="image"
            label="Category image"
            csrfToken={csrfToken}
          />
          <Select name="isActive" defaultValue="true">
            <option value="true">Active</option>
            <option value="false">Hidden</option>
          </Select>
          <Button type="submit">Add Category</Button>
        </form>
      </AdminCard>

      <AdminCard
        title="Categories List"
        description={`${items.length} categories saved in database`}
        contentClassName="grid gap-3"
      >
        {items.length === 0 ? <AdminEmpty message="No categories found" /> : null}
        {items.map((category) => (
          <CategoryWithSubcategories
            key={category.id}
            category={category}
            isExpanded={expandedCategoryId === category.id}
            onToggleExpand={() =>
              setExpandedCategoryId(expandedCategoryId === category.id ? null : category.id)
            }
            csrfToken={csrfToken}
            onRun={run}
          />
        ))}
      </AdminCard>
    </div>
  );
}

function CategoryWithSubcategories({
  category,
  isExpanded,
  onToggleExpand,
  csrfToken,
  onRun,
}: {
  category: AdminCategory;
  isExpanded: boolean;
  onToggleExpand: () => void;
  csrfToken: string | null;
  onRun: (action: () => Promise<unknown>, success: string) => Promise<boolean>;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [isAddingSubcategoryUploading, setIsAddingSubcategoryUploading] = useState(false);

  const subcategories = category.children ?? [];

  return (
    <div>
      <div className="rounded-xl border bg-card">
        <div
          className="flex items-center justify-between p-3"
          role="button"
          onClick={onToggleExpand}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onToggleExpand()}
        >
          <div className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <ImageWithFallback
                src={category.image}
                alt=""
                className="h-9 w-9 rounded-lg object-cover"
                fallbackVariant="category"
              />
              <span className="font-extrabold">{category.nameAr}</span>
              <AdminStatusBadge tone={category.isActive ? 'success' : 'neutral'}>
                {category.isActive ? 'Active' : 'Hidden'}
              </AdminStatusBadge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
              {category.slug}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                void onRun(
                  () =>
                    adminApi.updateCategory(
                      category.id,
                      { isActive: !category.isActive },
                      { csrfToken },
                    ),
                  category.isActive ? 'Category hidden' : 'Category activated',
                );
              }}
            >
              {category.isActive ? 'Hide' : 'Activate'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                if (
                  confirm(
                    'Delete category? Products will be hidden from store until moved to another category',
                  )
                )
                  void onRun(
                    () => adminApi.deleteCategory(category.id, { csrfToken }),
                    'Category deleted',
                  );
              }}
            >
              Delete
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setShowAddForm(!showAddForm);
              }}
            >
              <Plus className="h-4 w-4" />
              Subcategory
            </Button>
          </div>
        </div>

        {showAddForm ? (
          <div className="border-t p-3">
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const input = readSubcategoryForm(form);
                void onRun(
                  () => adminApi.createSubcategory(category.id, input, { csrfToken }),
                  'Subcategory added',
                ).then((didSave) => {
                  if (!didSave) return;
                  form.reset();
                  setShowAddForm(false);
                });
              }}
            >
              <div className="admin-form-grid">
                <Input name="nameAr" placeholder="Subcategory name" required />
                <Input name="nameEn" placeholder="English name" />
                <Input name="slug" dir="ltr" placeholder="subcategory-slug" required />
                <Input name="sortOrder" type="number" placeholder="Sort order" />
                <AdminSingleImageUploader
                  name="image"
                  label="Subcategory image"
                  csrfToken={csrfToken}
                  onUploadingChange={setIsAddingSubcategoryUploading}
                />
                <Select name="isActive" defaultValue="true">
                  <option value="true">Active</option>
                  <option value="false">Hidden</option>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isAddingSubcategoryUploading}>
                  Add Subcategory
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        {isExpanded ? (
          <div className="border-t p-3">
            <p className="mb-2 text-sm font-extrabold">Subcategories ({subcategories.length})</p>
            {subcategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subcategories yet</p>
            ) : (
              <div className="grid gap-2">
                {subcategories.map((sub) => (
                  <SubcategoryRow
                    key={sub.id}
                    subcategory={sub}
                    isEditing={editingSubcategoryId === sub.id}
                    onStartEdit={() => setEditingSubcategoryId(sub.id)}
                    onCancelEdit={() => setEditingSubcategoryId(null)}
                    csrfToken={csrfToken}
                    onRun={onRun}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SubcategoryRow({
  subcategory,
  onRun,
  isEditing,
  onStartEdit,
  onCancelEdit,
  csrfToken,
}: {
  subcategory: AdminCategory;
  onRun: (action: () => Promise<unknown>, success: string) => Promise<boolean>;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  csrfToken: string | null;
}) {
  const [isUploading, setIsUploading] = useState(false);

  return isEditing ? (
    <form
      className="grid gap-2 rounded-lg border bg-muted/20 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const input = readSubcategoryForm(e.currentTarget);
        void onRun(
          () => adminApi.updateSubcategory(subcategory.id, input, { csrfToken }),
          'Subcategory updated',
        ).then((didSave) => {
          if (didSave) onCancelEdit();
        });
      }}
    >
      <div className="admin-form-grid">
        <Input name="nameAr" defaultValue={subcategory.nameAr} required />
        <Input name="nameEn" defaultValue={subcategory.nameEn ?? ''} />
        <Input name="slug" dir="ltr" defaultValue={subcategory.slug} required />
        <Input name="sortOrder" type="number" defaultValue={subcategory.sortOrder} />
        <AdminSingleImageUploader
          name="image"
          label="Subcategory image"
          initialUrl={subcategory.image ?? ''}
          csrfToken={csrfToken}
          onUploadingChange={setIsUploading}
        />
        <Select name="isActive" defaultValue={String(subcategory.isActive)}>
          <option value="true">Active</option>
          <option value="false">Hidden</option>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isUploading}>
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancelEdit}>
          Cancel
        </Button>
      </div>
    </form>
  ) : (
    <div className="flex items-center justify-between rounded-lg border bg-muted/10 p-3">
      <div>
        <div className="flex items-center gap-2">
          <ImageWithFallback
            src={subcategory.image}
            alt=""
            className="h-8 w-8 rounded-lg object-cover"
            fallbackVariant="subcategory"
          />
          <span className="font-bold">{subcategory.nameAr}</span>
          <AdminStatusBadge tone={subcategory.isActive ? 'success' : 'neutral'}>
            {subcategory.isActive ? 'Active' : 'Hidden'}
          </AdminStatusBadge>
        </div>
        <p className="text-xs text-muted-foreground" dir="ltr">
          {subcategory.slug} • Sort: {subcategory.sortOrder}
        </p>
      </div>
      <div className="flex gap-1">
        <Button type="button" size="sm" variant="outline" onClick={onStartEdit}>
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            void onRun(
              () =>
                adminApi.updateSubcategory(
                  subcategory.id,
                  { isActive: !subcategory.isActive },
                  { csrfToken },
                ),
              subcategory.isActive ? 'Subcategory hidden' : 'Subcategory activated',
            );
          }}
        >
          {subcategory.isActive ? 'Hide' : 'Activate'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            if (confirm('Delete subcategory?'))
              void onRun(
                () => adminApi.deleteSubcategory(subcategory.id, { csrfToken }),
                'Subcategory deleted',
              );
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function AdminSingleImageUploader({
  csrfToken,
  initialUrl = '',
  label,
  name,
  uploadFolder = 'rs-store/categories',
  onUploadingChange,
}: {
  csrfToken: string | null;
  initialUrl?: string;
  label: string;
  name: string;
  uploadFolder?: string;
  onUploadingChange?: (isUploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose a JPG, PNG, WEBP, GIF, or other image file');
      return;
    }

    setIsUploading(true);
    onUploadingChange?.(true);
    setError(null);
    try {
      const uploaded = await adminApi.uploadImage(file, uploadFolder, { csrfToken });
      setImageUrl(uploaded.secureUrl);
    } catch (caughtError) {
      setError(toUserMessage(caughtError, 'Unable to upload image'));
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    void uploadFile(event.target.files?.[0]);
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void uploadFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="admin-category-image-uploader">
      <input type="hidden" name={name} value={imageUrl} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleInputChange}
        disabled={isUploading}
      />
      <div
        className={`admin-category-image-dropzone ${isDragging ? 'is-dragging' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isUploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="admin-category-image-preview">
          {imageUrl ? (
            <img src={imageUrl} alt="" />
          ) : (
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <p>{label}</p>
          <span>{isUploading ? 'Uploading image...' : 'Drag & drop or tap to choose'}</span>
        </div>
        <UploadCloud className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      {error ? <p className="admin-category-image-error">{error}</p> : null}
    </div>
  );
}

function readCategoryForm(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    nameAr: String(data.get('nameAr') ?? '').trim(),
    nameEn: String(data.get('nameEn') ?? '').trim() || undefined,
    slug: normalizeSlug(String(data.get('slug') ?? '')),
    sortOrder: Number(data.get('sortOrder') || 0),
    image: String(data.get('image') ?? '').trim() || undefined,
    isActive: String(data.get('isActive') ?? 'true') === 'true',
  };
}

function readSubcategoryForm(form: HTMLFormElement): AdminSubcategoryInput {
  const data = new FormData(form);
  return {
    nameAr: String(data.get('nameAr') ?? '').trim(),
    nameEn: String(data.get('nameEn') ?? '').trim() || undefined,
    slug: normalizeSlug(String(data.get('slug') ?? '')),
    sortOrder: Number(data.get('sortOrder') || 0),
    image: String(data.get('image') ?? '').trim() || undefined,
    isActive: String(data.get('isActive') ?? 'true') === 'true',
  };
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function Feedback({ error, message }: { error: string | null; message: string | null }) {
  return (
    <>
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          {message}
        </div>
      ) : null}
    </>
  );
}
