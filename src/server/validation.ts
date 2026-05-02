export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const UNSAFE_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export const INPUT_LIMITS = {
  username: 39,
  repoName: 100,
  branchName: 120,
  path: 512,
  displayName: 80,
  pronouns: 40,
  location: 120,
  websiteUrl: 300,
  bio: 500,
  searchQuery: 80,
  repoDescription: 2000,
  title: 200,
  longDescription: 20000,
  markdown: 200000,
  issueComment: 10000,
  commitMessage: 300,
  tagName: 100,
  releaseAssetName: 180,
  releaseAssetCount: 10,
  pinCount: 6,
  fileContent: 3 * 1024 * 1024,
  readmeContent: 100_000,
} as const;

type StringOptions = {
  field: string;
  maxLength: number;
  minLength?: number;
  pattern?: RegExp;
  trim?: boolean;
  allowEmpty?: boolean;
};

const normalize = (value: string) => value.normalize('NFKC');

export const readString = (value: unknown, options: StringOptions) => {
  const {
    field,
    maxLength,
    minLength = 0,
    pattern,
    trim = true,
    allowEmpty = true,
  } = options;

  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`);
  }

  const normalized = trim ? normalize(value).trim() : normalize(value);
  if (UNSAFE_CONTROL_CHARS.test(normalized)) {
    throw new ValidationError(`${field} contains invalid characters`);
  }
  if (!allowEmpty && normalized.length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  if (normalized.length < minLength) {
    throw new ValidationError(`${field} is too short`);
  }
  if (normalized.length > maxLength) {
    throw new ValidationError(`${field} is too long`);
  }
  if (pattern && normalized.length > 0 && !pattern.test(normalized)) {
    throw new ValidationError(`${field} format is invalid`);
  }
  return normalized;
};

export const readOptionalString = (value: unknown, options: Omit<StringOptions, 'allowEmpty'> & { emptyAsNull?: boolean }) => {
  if (value === undefined || value === null) return null;
  const normalized = readString(value, { ...options, allowEmpty: true });
  if (options.emptyAsNull !== false && normalized.length === 0) return null;
  return normalized;
};

export const readBoolean = (value: unknown, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  return Boolean(value);
};

export const readInteger = (
  value: unknown,
  {
    field,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    defaultValue,
  }: { field: string; min?: number; max?: number; defaultValue?: number }
) => {
  if (value === undefined || value === null || value === '') {
    if (defaultValue !== undefined) return defaultValue;
    throw new ValidationError(`${field} is required`);
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed)) {
    throw new ValidationError(`${field} must be an integer`);
  }
  if (parsed < min || parsed > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max}`);
  }
  return parsed;
};

export const readStringArray = (
  value: unknown,
  {
    field,
    itemField,
    maxItems,
    maxItemLength,
    pattern,
  }: {
    field: string;
    itemField: string;
    maxItems: number;
    maxItemLength: number;
    pattern?: RegExp;
  }
) => {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${field} must be an array`);
  }
  if (value.length > maxItems) {
    throw new ValidationError(`${field} has too many items`);
  }
  return value.map((item) =>
    readString(item, {
      field: itemField,
      maxLength: maxItemLength,
      pattern,
    })
  );
};

export const readBranchName = (value: unknown, field = 'branch') =>
  readString(value, {
    field,
    maxLength: INPUT_LIMITS.branchName,
    allowEmpty: false,
    pattern: /^[A-Za-z0-9._/-]+$/,
  });

export const readRepoName = (value: unknown, field = 'repository name') =>
  readString(value, {
    field,
    maxLength: INPUT_LIMITS.repoName,
    allowEmpty: false,
    pattern: /^[A-Za-z0-9._-]+$/,
  });

export const readRepoPath = (value: unknown, field = 'path') =>
  readString(value, {
    field,
    maxLength: INPUT_LIMITS.path,
    allowEmpty: false,
    trim: false,
    pattern: /^(?!\/)(?!.*\.\.)(?!.*\/\/)[^\u0000-\u001F]+$/,
  });

export const readUsername = (value: unknown, field = 'username') =>
  readString(value, {
    field,
    maxLength: INPUT_LIMITS.username,
    allowEmpty: false,
    pattern: /^[a-zA-Z0-9._-]+$/,
  });

export const readSafeUrl = (value: unknown, field = 'URL') => {
  const url = readOptionalString(value, { field, maxLength: INPUT_LIMITS.websiteUrl });
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ValidationError(`${field} must use http or https`);
    }
    return parsed.toString();
  } catch {
    throw new ValidationError(`${field} is invalid`);
  }
};

export const readSearchQuery = (value: unknown) =>
  readOptionalString(value, {
    field: 'search query',
    maxLength: INPUT_LIMITS.searchQuery,
  }) || '';

/**
 * Escapes SQL LIKE/ILIKE wildcard characters (%, _) in user input.
 * Without this, attackers can inject `%` to match everything or craft
 * expensive patterns that cause slow full-table scans.
 */
export const escapeLikePattern = (value: string) =>
  value.replace(/[%_\\]/g, (ch) => `\\${ch}`);
