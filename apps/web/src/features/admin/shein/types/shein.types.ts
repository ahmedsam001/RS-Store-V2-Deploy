import type { AdminSheinAssistJob, AdminSheinImport, AdminSheinMarketplaceSettings, AdminCategory } from '@/features/admin/api/admin-api';

export type Notice = { type: 'success' | 'warning' | 'error'; message: string } | null;

export type ReviewChecklistStep = { label: string; done: boolean };

export type SheinImportWorkflowReturn = {
  response: { items: AdminSheinImport[]; meta: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean } } | null;
  categories: AdminCategory[];
  selectedId: string;
  selected: AdminSheinImport | null;
  marketplace: AdminSheinMarketplaceSettings;
  sarExchangeRate: number;
  sourceUrl: string;
  isStarting: boolean;
  handleCreate: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleSourceUrlChange: (value: string) => void;
  handleMarketplaceSaved: (next: AdminSheinMarketplaceSettings) => void;
  handleSelectImport: (id: string) => void;
  handlePageChange: (page: number) => void;
};

export type SheinReviewEditorProps = {
  item: AdminSheinImport;
  categories: AdminCategory[];
  marketplace: AdminSheinMarketplaceSettings;
  sarExchangeRate: number;
  onActionComplete: () => Promise<void>;
};

export type SheinPriceSummaryProps = {
  sheinPrice: string | number | undefined;
  exchangeRate: number;
  storePrice: string;
  discount: number;
  rating: number;
};

export type SheinImportStepsPanelProps = {
  job: AdminSheinAssistJob | null;
  isContinuing?: boolean;
  onContinue?: () => Promise<void>;
};

export type SheinMarketplaceCardProps = {
  marketplace: AdminSheinMarketplaceSettings;
  onSaved: (value: AdminSheinMarketplaceSettings) => void;
};

export type SheinImportStartCardProps = {
  sourceUrl: string;
  isStarting: boolean;
  onSourceUrlChange: (value: string) => void;
  onCreate: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onClear: () => void;
};

export type SheinReviewProgressProps = {
  currentStepIndex: number;
};

export type SheinReviewChecklistProps = {
  steps: ReviewChecklistStep[];
};

export type SheinImportHistoryListProps = {
  items: AdminSheinImport[];
  selectedId: string;
  onSelect: (id: string) => void;
};
