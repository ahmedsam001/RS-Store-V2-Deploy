import { useEffect } from 'react';

type OpenGraphMetadata = {
  title?: string;
  description?: string;
  type?: string;
  image?: string;
  url?: string;
  locale?: string;
};

type DocumentMetadata = {
  title: string;
  description?: string;
  canonicalPath?: string;
  robots?: string;
  openGraph?: OpenGraphMetadata;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const descriptionSelector = 'meta[name="description"]';
const robotsSelector = 'meta[name="robots"]';
const canonicalSelector = 'link[rel="canonical"]';
const structuredDataId = 'rs-store-route-structured-data';

export function useDocumentMetadata(metadata: DocumentMetadata): void {
  useEffect(() => {
    document.title = metadata.title;
    if (metadata.description) upsertMeta(descriptionSelector, 'description', metadata.description);
    if (metadata.robots) upsertMeta(robotsSelector, 'robots', metadata.robots);
    const canonicalUrl = metadata.canonicalPath
      ? new URL(metadata.canonicalPath, window.location.origin).toString()
      : undefined;
    if (canonicalUrl) upsertCanonical().href = canonicalUrl;
    upsertOpenGraph({
      title: metadata.openGraph?.title ?? metadata.title,
      description: metadata.openGraph?.description ?? metadata.description,
      type: metadata.openGraph?.type ?? 'website',
      url: metadata.openGraph?.url ?? canonicalUrl,
      image: metadata.openGraph?.image,
      locale: metadata.openGraph?.locale ?? 'ar_EG',
    });
    upsertStructuredData(metadata.structuredData);
  }, [
    metadata.canonicalPath,
    metadata.description,
    metadata.openGraph,
    metadata.robots,
    metadata.structuredData,
    metadata.title,
  ]);
}

function upsertMeta(selector: string, name: string, content: string): HTMLMetaElement {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.append(element);
  }
  element.content = content;
  return element;
}

function upsertPropertyMeta(property: string, content: string | undefined): void {
  if (!content) return;
  const selector = `meta[property="${property}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.append(element);
  }
  element.content = content;
}

function upsertOpenGraph(metadata: OpenGraphMetadata): void {
  upsertPropertyMeta('og:title', metadata.title);
  upsertPropertyMeta('og:description', metadata.description);
  upsertPropertyMeta('og:type', metadata.type);
  upsertPropertyMeta('og:url', metadata.url);
  upsertPropertyMeta('og:image', metadata.image);
  upsertPropertyMeta('og:locale', metadata.locale);
}

function upsertCanonical(): HTMLLinkElement {
  let element = document.head.querySelector<HTMLLinkElement>(canonicalSelector);
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.append(element);
  }
  return element;
}

function upsertStructuredData(value: DocumentMetadata['structuredData']): void {
  let element = document.getElementById(structuredDataId) as HTMLScriptElement | null;
  if (!value) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('script');
    element.type = 'application/ld+json';
    element.id = structuredDataId;
    document.head.append(element);
  }
  element.text = JSON.stringify(value);
}
