const ProductSchema = {
  type: 'object',
  required: ['id', 'name', 'sku', 'currency', 'options'],
  properties: {
    id: { type: 'string', description: 'Уникальный идентификатор товара (slug)' },
    name: { type: 'string', description: 'Название товара для отображения' },
    sku: { type: 'string', description: 'Артикул товара' },
    type: { type: 'string', enum: ['simple', 'parametric'], description: 'Тип расчёта цены' },
    basePrice: { type: 'number', description: 'Базовая цена (только для simple)' },
    currency: { type: 'string', enum: ['KZT', 'RUB', 'USD'], description: 'Валюта' },
    paramGroup: { type: 'string', description: 'Группа правил для parametric (ключ в PRICING_RULES)' },
    options: {
      type: 'array',
      description: 'Группы опций для конфигурации',
      items: {
        type: 'object',
        required: ['id', 'name', 'type', 'values'],
        properties: {
          id: { type: 'string', description: 'Уникальный ID группы опций' },
          name: { type: 'string', description: 'Название группы (Материал, Цвет, ...)' },
          type: { type: 'string', enum: ['text', 'color', 'counter', 'multicheck'], description: 'Тип отображения' },
          min: { type: 'number', description: 'Минимум (для counter)' },
          max: { type: 'number', description: 'Максимум (для counter)' },
          default: { type: 'number', description: 'Значение по умолчанию (для counter)' },
          dependsOn: {
            type: 'object',
            description: 'Связь с другой опцией (цвет зависит от материала)',
            properties: {
              option: { type: 'string', description: 'ID родительской опции' },
              values: { type: 'object', description: 'Маппинг: родительский value → доступные value этой опции' },
            },
          },
          values: {
            type: 'array',
            description: 'Доступные значения опции',
            items: {
              type: 'object',
              required: ['id', 'name'],
              properties: {
                id: { type: 'string', description: 'Уникальный ID значения' },
                name: { type: 'string', description: 'Название для отображения' },
                hex: { type: 'string', description: 'HEX-код цвета (только для type: color)' },
                priceModifier: { type: 'number', description: 'Надбавка к цене (отрицательная = скидка)' },
                imageSuffix: { type: 'string', description: 'Суффикс для построения пути к WebP' },
                availableFor: { type: 'array', items: { type: 'string' }, description: 'Ограничение по материалам (для цветов)' },
              },
            },
          },
        },
      },
    },
  },
};

function validateProduct(product) {
  const errors = [];
  if (!product.id) errors.push('product.id is required');
  if (!product.name) errors.push('product.name is required');
  if (!product.sku) errors.push('product.sku is required');
  if (product.type === 'simple' && typeof product.basePrice !== 'number') {
    errors.push('simple product basePrice must be a number');
  }
  if (!Array.isArray(product.options) || product.options.length === 0) {
    errors.push('product.options must be a non-empty array');
  } else {
    for (const opt of product.options) {
      if (!opt.id) errors.push(`option missing id`);
      if (!opt.name) errors.push(`option "${opt.id}" missing name`);
      if (!['text', 'color', 'counter', 'multicheck'].includes(opt.type)) {
        errors.push(`option "${opt.id}" type must be text, color, counter, or multicheck`);
      }
      if (opt.type === 'counter' && typeof opt.min !== 'number') {
        errors.push(`counter option "${opt.id}" must have min`);
      }
      if (!Array.isArray(opt.values) || opt.values.length === 0) {
        errors.push(`option "${opt.id}" must have at least one value`);
      } else {
        for (const val of opt.values) {
          if (!val.id) errors.push(`option "${opt.id}" value missing id`);
          if (!val.name) errors.push(`option "${opt.id}" value "${val.id}" missing name`);
        }
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
