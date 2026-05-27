const PRODUCTS = [
  {
    id: 'sofa-classic',
    name: 'Диван классический',
    sku: 'SOFA-CL-001',
    type: 'simple',
    basePrice: 250000,
    currency: 'KZT',
    exampleImage: 'products/sofa-classic/images/Gemini_Generated_Image_23eg9523eg9523eg.png',
    options: [
      {
        id: 'material',
        name: 'Материал',
        type: 'text',
        values: [
          { id: 'fabric', name: 'Ткань', priceModifier: 0, imageSuffix: 'fabric' },
          { id: 'eco-leather', name: 'Эко-кожа', priceModifier: 30000, imageSuffix: 'ecoleather' },
          { id: 'velvet', name: 'Велюр', priceModifier: 50000, imageSuffix: 'velvet' },
        ],
      },
      {
        id: 'color',
        name: 'Цвет',
        type: 'color',
        dependsOn: { option: 'material', values: { fabric: ['ivory', 'grey', 'blue'], 'eco-leather': ['brown', 'black', 'white'], velvet: ['green', 'burgundy', 'blue'] } },
        values: [
          { id: 'ivory', name: 'Айвори', hex: '#FFFFF0', priceModifier: 0, imageSuffix: 'ivory', availableFor: ['fabric'] },
          { id: 'grey', name: 'Серый', hex: '#808080', priceModifier: 0, imageSuffix: 'grey', availableFor: ['fabric'] },
          { id: 'blue', name: 'Синий', hex: '#1E3A5F', priceModifier: 0, imageSuffix: 'blue', availableFor: ['fabric', 'velvet'] },
          { id: 'brown', name: 'Коричневый', hex: '#5C3A2E', priceModifier: 0, imageSuffix: 'brown', availableFor: ['eco-leather'] },
          { id: 'black', name: 'Чёрный', hex: '#1A1A1A', priceModifier: 0, imageSuffix: 'black', availableFor: ['eco-leather'] },
          { id: 'white', name: 'Белый', hex: '#F5F5F5', priceModifier: 0, imageSuffix: 'white', availableFor: ['eco-leather'] },
          { id: 'green', name: 'Изумрудный', hex: '#0B6623', priceModifier: 10000, imageSuffix: 'green', availableFor: ['velvet'] },
          { id: 'burgundy', name: 'Бордовый', hex: '#800020', priceModifier: 10000, imageSuffix: 'burgundy', availableFor: ['velvet'] },
        ],
      },
      {
        id: 'legs',
        name: 'Ножки',
        type: 'text',
        values: [
          { id: 'wood', name: 'Деревянные', priceModifier: 0, imageSuffix: 'wood' },
          { id: 'metal', name: 'Металлические', priceModifier: 15000, imageSuffix: 'metal' },
          { id: 'none', name: 'Без ножек (цоколь)', priceModifier: -10000, imageSuffix: 'none' },
        ],
      },
      {
        id: 'size',
        name: 'Размер',
        type: 'text',
        values: [
          { id: '2seat', name: 'Двухместный (140 см)', priceModifier: 0, imageSuffix: '2seat' },
          { id: '3seat', name: 'Трёхместный (200 см)', priceModifier: 60000, imageSuffix: '3seat' },
          { id: 'corner', name: 'Угловой', priceModifier: 150000, imageSuffix: 'corner' },
        ],
      },
    ],
  },
  {
    id: 'wardrobe',
    name: 'Шкаф-купе распашной',
    sku: 'WARD-001',
    type: 'parametric',
    currency: 'KZT',
    paramGroup: 'wardrobe',
    options: [
      {
        id: 'material',
        name: 'Материал корпуса',
        type: 'text',
        values: [
          { id: 'ldsp_white', name: 'ЛДСП белый' },
          { id: 'ldsp_oak', name: 'ЛДСП дуб' },
          { id: 'ldsp_wenge', name: 'ЛДСП венге' },
          { id: 'mdf_white', name: 'МДФ белый матовый' },
          { id: 'mdf_gloss', name: 'МДФ глянец' },
        ],
      },
      {
        id: 'facade',
        name: 'Материал фасадов',
        type: 'text',
        values: [
          { id: 'ldsp', name: 'ЛДСП' },
          { id: 'mdf', name: 'МДФ матовый' },
          { id: 'mdf_gloss', name: 'МДФ глянец' },
          { id: 'glass', name: 'Стекло' },
        ],
      },
      {
        id: 'sections',
        name: 'Секции',
        type: 'counter',
        min: 1, max: 6, default: 2,
      },
      {
        id: 'shelves',
        name: 'Полки',
        type: 'counter',
        min: 0, max: 20, default: 3,
      },
      {
        id: 'drawers',
        name: 'Ящики',
        type: 'counter',
        min: 0, max: 8, default: 1,
      },
      {
        id: 'fittings',
        name: 'Фурнитура',
        type: 'multicheck',
        values: [
          { id: 'soft_close', name: 'Доводчики на двери' },
          { id: 'lighting', name: 'Встроенная подсветка' },
          { id: 'full_extension', name: 'Направляющие полного выдвижения' },
        ],
      },
    ],
  },
];

function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || PRODUCTS[0];
}

function getDefaultConfig(productId) {
  const product = getProduct(productId);
  const config = { product: product.id };
  if (product.type === 'parametric') {
    const pcfg = getParametricDefaultConfig(product.paramGroup);
    Object.assign(config, pcfg);
    return config;
  }
  for (const opt of product.options) {
    config[opt.id] = opt.values[0].id;
  }
  return config;
}

function getOption(productId, optionId) {
  const product = getProduct(productId);
  return product.options.find((o) => o.id === optionId);
}

function getOptionValue(productId, optionId, valueId) {
  const opt = getOption(productId, optionId);
  return opt?.values.find((v) => v.id === valueId);
}

function calcPrice(config) {
  return calcPriceBreakdown(config).total;
}

function calcPriceBreakdown(config) {
  const product = getProduct(config.product);
  if (product.type === 'parametric') {
    const result = calcParametricPrice(product.paramGroup, config);
    if (result) {
      return { product, basePrice: 0, items: result.items, total: result.total };
    }
  }
  const items = [];
  items.push({ label: 'Базовая цена', value: product.basePrice, modifier: 0, type: 'base' });
  for (const opt of product.options) {
    const val = getOptionValue(product.id, opt.id, config[opt.id]);
    if (val && val.priceModifier !== 0) {
      items.push({ label: opt.name + ': ' + val.name, value: val.priceModifier, modifier: val.priceModifier, type: 'option' });
    }
  }
  const total = product.basePrice + items.filter((i) => i.type === 'option').reduce((s, i) => s + i.modifier, 0);
  return { product, basePrice: product.basePrice, items, total };
}

function formatPrice(n, currency) {
  const curr = currency || 'KZT';
  const locales = { KZT: 'kk-KZ', RUB: 'ru-RU', USD: 'en-US' };
  return new Intl.NumberFormat(locales[curr] || 'kk-KZ', { style: 'currency', currency: curr, maximumFractionDigits: 0 }).format(n);
}
