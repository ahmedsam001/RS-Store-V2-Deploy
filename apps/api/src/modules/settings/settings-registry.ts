import { BadRequestException } from '@nestjs/common';
import { SettingScope } from '@prisma/client';

type SettingValueType =
  | 'string'
  | 'number'
  | 'url'
  | 'phone'
  | 'currency'
  | 'sheinCountry'
  | 'sheinFixedCurrency'
  | 'sheinLanguage';

type SettingDefinition = {
  key: string;
  scope: SettingScope;
  type: SettingValueType;
  label: string;
  required: boolean;
  min?: number;
  max?: number;
};

const definitions: SettingDefinition[] = [
  {
    key: 'store.name',
    scope: SettingScope.PUBLIC,
    type: 'string',
    label: 'Store name',
    required: true,
  },
  {
    key: 'store.whatsapp',
    scope: SettingScope.PUBLIC,
    type: 'phone',
    label: 'WhatsApp number',
    required: false,
  },
  {
    key: 'store.phone',
    scope: SettingScope.PUBLIC,
    type: 'phone',
    label: 'Phone number',
    required: false,
  },
  {
    key: 'store.instagram',
    scope: SettingScope.PUBLIC,
    type: 'url',
    label: 'Instagram URL',
    required: false,
  },
  {
    key: 'store.currency',
    scope: SettingScope.PUBLIC,
    type: 'currency',
    label: 'Currency',
    required: true,
  },
  {
    key: 'payment.depositMinPercent',
    scope: SettingScope.PUBLIC,
    type: 'number',
    label: 'Minimum deposit percent',
    required: true,
    min: 50,
    max: 70,
  },
  {
    key: 'payment.depositDefaultPercent',
    scope: SettingScope.PUBLIC,
    type: 'number',
    label: 'Default deposit percent',
    required: true,
    min: 50,
    max: 70,
  },
  {
    key: 'payment.vodafoneFeePercent',
    scope: SettingScope.PUBLIC,
    type: 'number',
    label: 'Vodafone Cash fee percent',
    required: true,
    min: 0,
    max: 20,
  },
  {
    key: 'payment.vodafoneCash',
    scope: SettingScope.PUBLIC,
    type: 'phone',
    label: 'Vodafone Cash',
    required: true,
  },
  {
    key: 'payment.instapay',
    scope: SettingScope.PUBLIC,
    type: 'string',
    label: 'Instapay',
    required: true,
  },
  {
    key: 'shipping.estimatedDays',
    scope: SettingScope.PUBLIC,
    type: 'number',
    label: 'Estimated shipping days',
    required: true,
    min: 1,
    max: 120,
  },
  {
    key: 'shein.import.country',
    scope: SettingScope.ADMIN,
    type: 'sheinCountry',
    label: 'SHEIN import country',
    required: false,
  },
  {
    key: 'shein.import.currency',
    scope: SettingScope.ADMIN,
    type: 'sheinFixedCurrency',
    label: 'SHEIN import currency',
    required: false,
  },
  {
    key: 'shein.import.language',
    scope: SettingScope.ADMIN,
    type: 'sheinLanguage',
    label: 'SHEIN import language',
    required: false,
  },
  {
    key: 'shein.import.sarExchangeRate',
    scope: SettingScope.ADMIN,
    type: 'number',
    label: 'SHEIN SAR exchange rate',
    required: true,
    min: 1,
    max: 1000,
  },
];

const registry = new Map(definitions.map((definition) => [definition.key, definition]));

export function getSettingDefinitions(): SettingDefinition[] {
  return definitions.map((definition) => ({ ...definition }));
}

export function getSettingDefinition(key: string): SettingDefinition | undefined {
  return registry.get(key);
}

export function validateSettingValue(
  key: string,
  value: unknown,
  scope: SettingScope | undefined,
): { value: string | number; scope: SettingScope } {
  const definition = registry.get(key);
  if (!definition) {
    throw new BadRequestException(`Unsupported setting key: ${key}`);
  }

  if (scope && scope !== definition.scope) {
    throw new BadRequestException(`${definition.label} must use ${definition.scope} scope`);
  }

  const normalized = normalizeValue(definition, value);
  return { value: normalized, scope: definition.scope };
}

function normalizeValue(definition: SettingDefinition, value: unknown): string | number {
  const raw = String(value ?? '').trim();
  if (!raw) {
    if (definition.required) {
      throw new BadRequestException(`${definition.label} is required`);
    }
    return '';
  }

  if (definition.type === 'number') {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`${definition.label} must be a number`);
    }
    if (definition.min !== undefined && parsed < definition.min) {
      throw new BadRequestException(`${definition.label} must be at least ${definition.min}`);
    }
    if (definition.max !== undefined && parsed > definition.max) {
      throw new BadRequestException(`${definition.label} must be at most ${definition.max}`);
    }
    if (
      (definition.key === 'payment.depositMinPercent' ||
        definition.key === 'payment.depositDefaultPercent') &&
      ![50, 60, 70].includes(parsed)
    ) {
      throw new BadRequestException(`${definition.label} must be 50, 60, or 70`);
    }
    return parsed;
  }

  if (definition.type === 'currency') {
    const currency = raw.toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new BadRequestException(`${definition.label} must be a 3 letter currency code`);
    }
    return currency;
  }

  if (definition.type === 'sheinCountry') {
    const country = raw.toUpperCase();
    if (!['KW', 'SA', 'AE', 'QA', 'BH', 'OM'].includes(country)) {
      throw new BadRequestException(`${definition.label} must be KW, SA, AE, QA, BH, or OM`);
    }
    return country;
  }

  if (definition.type === 'sheinFixedCurrency') {
    const currency = raw.toUpperCase();
    if (currency !== 'SAR') {
      throw new BadRequestException(`${definition.label} must be SAR`);
    }
    return 'SAR';
  }

  if (definition.type === 'sheinLanguage') {
    const language = raw.toLowerCase();
    if (!['ar', 'en'].includes(language)) {
      throw new BadRequestException(`${definition.label} must be ar or en`);
    }
    return language;
  }

  if (definition.type === 'phone') {
    if (!/^\+?[0-9\s-]{7,20}$/.test(raw)) {
      throw new BadRequestException(`${definition.label} must be a valid phone number`);
    }
    return raw;
  }

  if (definition.type === 'url') {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
      return url.toString();
    } catch {
      throw new BadRequestException(`${definition.label} must be a valid URL`);
    }
  }

  if (raw.length > 500) {
    throw new BadRequestException(`${definition.label} is too long`);
  }
  return raw;
}
