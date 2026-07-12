import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import moduleSource from './admin-arabic.ts?raw';
import adminShellSource from '../components/AdminShell.tsx?raw';

const arabicPattern = /[\u0600-\u06ff]/u;
const protectedDataProperties = new Set([
  'address',
  'adminNote',
  'customerNote',
  'email',
  'errorMessage',
  'fileName',
  'filename',
  'name',
  'nameAr',
  'nameEn',
  'note',
  'notes',
  'orderNumber',
  'phone',
  'sku',
  'slug',
  'sourceUrl',
  'trackingNumber',
]);
const sourceFile = ts.createSourceFile(
  'admin-arabic.ts',
  moduleSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

type TranslationEntry = { english: string; arabic: string };

function translationEntries(): TranslationEntry[] {
  let translations: ts.ObjectLiteralExpression | undefined;

  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(sourceFile) === 'ADMIN_ARABIC_TRANSLATIONS'
    ) {
      const initializer = node.initializer;
      const expression = initializer && ts.isAsExpression(initializer) ? initializer.expression : initializer;
      if (expression && ts.isObjectLiteralExpression(expression)) translations = expression;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (!translations) throw new Error('ADMIN_ARABIC_TRANSLATIONS object was not found');

  return translations.properties.flatMap((property) => {
    if (!ts.isPropertyAssignment(property) || !ts.isStringLiteralLike(property.initializer)) {
      return [];
    }
    const name = property.name;
    const english = ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : undefined;
    return english ? [{ english, arabic: property.initializer.text }] : [];
  });
}

function hasNoTranslateAttribute(attributes: ts.JsxAttributes): boolean {
  return attributes.properties.some(
    (property) =>
      ts.isJsxAttribute(property) && property.name.getText() === 'data-no-admin-translate',
  );
}

function isProtectedByAncestor(node: ts.Node): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (
      ts.isJsxElement(current) &&
      hasNoTranslateAttribute(current.openingElement.attributes)
    ) {
      return true;
    }
    if (ts.isJsxSelfClosingElement(current) && hasNoTranslateAttribute(current.attributes)) {
      return true;
    }
  }
  return false;
}

function containsProtectedDataReference(node: ts.Node): boolean {
  let found = false;
  const visit = (current: ts.Node): void => {
    if (found) return;
    if (
      ts.isPropertyAccessExpression(current) &&
      protectedDataProperties.has(current.name.text)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

function containsNestedJsx(node: ts.Node): boolean {
  let found = false;
  const visit = (current: ts.Node): void => {
    if (found) return;
    if (
      current !== node &&
      (ts.isJsxElement(current) ||
        ts.isJsxSelfClosingElement(current) ||
        ts.isJsxFragment(current))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

function translatedDomAttribute(attribute: ts.JsxAttribute): boolean {
  if (!['alt', 'aria-label', 'title'].includes(attribute.name.getText())) return false;
  const owner = attribute.parent.parent;
  if (!ts.isJsxSelfClosingElement(owner) && !ts.isJsxOpeningElement(owner)) return false;
  const tagName = owner.tagName.getText();
  return tagName === 'ImageWithFallback' || /^[a-z]/.test(tagName);
}

describe('admin language source integrity audit', () => {
  const entries = translationEntries();

  it('keeps English sources English and requires Arabic values', () => {
    const intentionallyUntranslated = new Set([
      'CAPTCHA',
      'Chrome',
      'Cloudinary',
      'RS Store',
      'RS Store V2',
      'SKU',
      'V1',
    ]);
    const arabicEnglishSources = entries
      .filter(({ english }) => arabicPattern.test(english))
      .map(({ english }) => english);
    const missingArabic = entries
      .filter(
        ({ arabic }) =>
          !arabic.trim() || (!arabicPattern.test(arabic) && !intentionallyUntranslated.has(arabic)),
      )
      .map(({ english }) => english);

    expect(arabicEnglishSources).toEqual([]);
    expect(missingArabic).toEqual([]);
  });

  it('rejects conflicting translations for the same English interface string', () => {
    const valuesByEnglish = new Map<string, Set<string>>();
    for (const { english, arabic } of entries) {
      const values = valuesByEnglish.get(english) ?? new Set<string>();
      values.add(arabic);
      valuesByEnglish.set(english, values);
    }
    const conflicts = [...valuesByEnglish]
      .filter(([, values]) => values.size > 1)
      .map(([english, values]) => ({ english, arabic: [...values] }));

    expect(conflicts).toEqual([]);
  });

  it('keeps the localization bridge connected to one real admin root', () => {
    expect(adminShellSource.match(/useAdminArabicLocalization\(language\)/g)).toHaveLength(1);
    expect(adminShellSource.match(/id="admin-root"/g)).toHaveLength(1);
  });

  it('does not allow Arabic literals in admin pages outside controlled translation sources', () => {
    const sources = import.meta.glob('../**/*.{ts,tsx}', {
      eager: true,
      import: 'default',
      query: '?raw',
    }) as Record<string, string>;
    const allowedArabicSources = new Set(['../components/AdminDesign.tsx', './admin-arabic.ts']);
    const unexpected = Object.entries(sources)
      .filter(([path]) => !/\.(?:test|spec)\.[^.]+$/.test(path))
      .filter(([path]) => !allowedArabicSources.has(path))
      .filter(([, source]) => arabicPattern.test(source))
      .map(([path]) => path);

    expect(unexpected).toEqual([]);
  });

  it('protects rendered user and API values from the DOM translation bridge', () => {
    const sources = import.meta.glob('../**/*.tsx', {
      eager: true,
      import: 'default',
      query: '?raw',
    }) as Record<string, string>;
    const unprotected: string[] = [];

    for (const [path, source] of Object.entries(sources)) {
      if (/\.(?:test|spec)\.tsx$/.test(path)) continue;
      const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

      const visit = (node: ts.Node): void => {
        if (
          ts.isJsxExpression(node) &&
          node.expression &&
          ts.isJsxElement(node.parent) &&
          !containsNestedJsx(node.expression) &&
          containsProtectedDataReference(node.expression) &&
          !isProtectedByAncestor(node)
        ) {
          const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
          unprotected.push(`${path}:${line + 1}`);
        }

        if (
          ts.isJsxAttribute(node) &&
          translatedDomAttribute(node) &&
          node.initializer &&
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          containsProtectedDataReference(node.initializer.expression) &&
          !isProtectedByAncestor(node)
        ) {
          const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
          unprotected.push(`${path}:${line + 1}`);
        }

        ts.forEachChild(node, visit);
      };

      visit(file);
    }

    expect(unprotected).toEqual([]);
  });
});
