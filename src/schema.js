const ProductSchema = {
  type: 'object',
  required: ['id', 'name', 'sku', 'basePrice', 'currency', 'options'],
  properties: {
    id: { type: 'string', description: 'Уникальный идентификатор товара (slug)' },
    name: { type: 'string', description: 'Название товара для отображения' },
    sku: { type: 'string', description: 'Артикул товара' },
    basePrice: { type: 'number', description: 'Базовая цена в минимальной комплектации' },
    currency: { type: 'string', enum: ['KZT', 'RUB', 'USD'], description: 'Валюта' },
    options: {
      type: 'array',
      description: 'Группы опций для конфигурации',
      items: {
        type: 'object',
        required: ['id', 'name', 'type', 'values'],
        properties: {
          id: { type: 'string', description: 'Уникальный ID группы опций' },
          name: { type: 'string', description: 'Название группы (Материал, Цвет, ...)' },
          type: { type: 'string', enum: ['text', 'color'], description: 'Тип отображения: text — кнопка, color — цветовой свотч' },
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
              required: ['id', 'name', 'priceModifier', 'imageSuffix'],
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
  if (typeof product.basePrice !== 'number') errors.push('product.basePrice must be a number');
  if (!Array.isArray(product.options) || product.options.length === 0) {
    errors.push('product.options must be a non-empty array');
  } else {
    for (const opt of product.options) {
      if (!opt.id) errors.push(`option missing id`);
      if (!opt.name) errors.push(`option "${opt.id}" missing name`);
      if (!['text', 'color'].includes(opt.type)) errors.push(`option "${opt.id}" type must be text or color`);
      if (!Array.isArray(opt.values) || opt.values.length === 0) {
        errors.push(`option "${opt.id}" must have at least one value`);
      } else {
        for (const val of opt.values) {
          if (!val.id) errors.push(`option "${opt.id}" value missing id`);
          if (!val.name) errors.push(`option "${opt.id}" value "${val.id}" missing name`);
          if (typeof val.priceModifier !== 'number') errors.push(`option "${opt.id}" value "${val.id}" priceModifier must be a number`);
          if (!val.imageSuffix) errors.push(`option "${opt.id}" value "${val.id}" missing imageSuffix`);
        }
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
