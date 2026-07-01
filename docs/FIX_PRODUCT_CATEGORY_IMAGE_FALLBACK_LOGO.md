# Fix Product and Category Image Fallback Logo

## Goal

When a product category or subcategory image is missing or the image URL fails to load the UI should show the RS Store logo instead of an empty box broken image icon or generic placeholder.

## What changed

Added a shared frontend component:

```txt
apps/web/src/shared/components/ImageWithFallback.tsx
```

This component handles both cases:

```txt
src is null empty or undefined
image URL returns an error
```

In both cases it displays the RS Store transparent logo using the existing brand asset:

```txt
apps/web/src/assets/brand/rs-logo-transparent.png
```

## Applied areas

The fallback is now used in customer facing areas:

```txt
Product cards
Product gallery empty state
Cart product thumbnails
Flash sale product cards
Category circle navigation
Category tile navigation
Subcategory circle navigation
Responsive product images when the URL breaks
```

And admin areas:

```txt
Admin products list
Admin product image cards
Admin flash sale product picker
Admin category rows
Admin subcategory rows
Admin image upload gallery previews
```

## Database impact

No database changes
No backend changes
No migration required

This is a frontend only UI safety improvement.

## Behavior

```txt
Product image exists and loads correctly -> show product image
Product image missing -> show RS Store logo
Product image URL is broken -> show RS Store logo
Category image missing or broken -> show RS Store logo
Subcategory image missing or broken -> show RS Store logo
```
