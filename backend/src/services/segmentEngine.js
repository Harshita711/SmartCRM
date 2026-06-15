/**
 * Segment Engine
 * Converts a rule group (AND/OR tree) into a MongoDB query for the Customer collection.
 *
 * Rule shape: { field, operator, value }
 * Group shape: { condition: 'AND' | 'OR', rules: [Rule], groups: [Group] }
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const buildRuleQuery = (rule) => {
  const { field, operator, value } = rule;

  switch (operator) {
    case 'gt':
      return { [field]: { $gt: value } };
    case 'gte':
      return { [field]: { $gte: value } };
    case 'lt':
      return { [field]: { $lt: value } };
    case 'lte':
      return { [field]: { $lte: value } };
    case 'eq':
      return { [field]: value };
    case 'neq':
      return { [field]: { $ne: value } };
    case 'in':
      return { [field]: { $in: Array.isArray(value) ? value : [value] } };
    case 'before':
      return { [field]: { $lt: new Date(value) } };
    case 'after':
      return { [field]: { $gt: new Date(value) } };
    case 'olderThanDays': {
      // "last purchase before X days" -> lastPurchaseDate older than (now - X days)
      const cutoff = new Date(Date.now() - Number(value) * DAY_MS);
      return { [field]: { $lt: cutoff } };
    }
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
};

export const buildSegmentQuery = (ruleGroup) => {
  if (!ruleGroup) return {};

  const { condition = 'AND', rules = [], groups = [] } = ruleGroup;

  const clauses = [
    ...rules.map(buildRuleQuery),
    ...groups.map((g) => buildSegmentQuery(g)),
  ];

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];

  const mongoOperator = condition === 'OR' ? '$or' : '$and';
  return { [mongoOperator]: clauses };
};

/**
 * Validates a rule group has the expected shape and known fields/operators.
 */
const VALID_FIELDS = [
  'totalSpend',
  'totalOrders',
  'lastPurchaseDate',
  'location.city',
  'category',
  'segment',
  'leadScore',
];

const VALID_OPERATORS = [
  'gt',
  'gte',
  'lt',
  'lte',
  'eq',
  'neq',
  'in',
  'before',
  'after',
  'olderThanDays',
];

export const validateRuleGroup = (ruleGroup) => {
  if (!ruleGroup || typeof ruleGroup !== 'object') {
    throw new Error('ruleGroup must be an object');
  }

  const { condition = 'AND', rules = [], groups = [] } = ruleGroup;

  if (!['AND', 'OR'].includes(condition)) {
    throw new Error(`Invalid condition: ${condition}`);
  }

  for (const rule of rules) {
    if (!VALID_FIELDS.includes(rule.field)) {
      throw new Error(`Invalid field in rule: ${rule.field}`);
    }
    if (!VALID_OPERATORS.includes(rule.operator)) {
      throw new Error(`Invalid operator in rule: ${rule.operator}`);
    }
    if (rule.value === undefined || rule.value === null || rule.value === '') {
      throw new Error(`Missing value for field: ${rule.field}`);
    }
  }

  for (const group of groups) {
    validateRuleGroup(group);
  }

  return true;
};
