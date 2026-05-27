const PRICING_RULES = {
  wardrobe: {
    dimensions: {
      width: { min: 600, max: 3000, step: 10, default: 1200, label: 'Ширина' },
      height: { min: 400, max: 2800, step: 10, default: 2400, label: 'Высота' },
      depth: { min: 300, max: 1200, step: 10, default: 600, label: 'Глубина' },
    },
    materials: {
      ldsp_white: { name: 'ЛДСП белый', pricePerSqm: 4500 },
      ldsp_oak: { name: 'ЛДСП дуб', pricePerSqm: 5200 },
      ldsp_wenge: { name: 'ЛДСП венге', pricePerSqm: 5500 },
      mdf_white: { name: 'МДФ белый матовый', pricePerSqm: 8500 },
      mdf_gloss: { name: 'МДФ глянец', pricePerSqm: 11000 },
    },
    facades: {
      ldsp: { name: 'ЛДСП', pricePerSqm: 3500 },
      mdf: { name: 'МДФ матовый', pricePerSqm: 7000 },
      mdf_gloss: { name: 'МДФ глянец', pricePerSqm: 9500 },
      glass: { name: 'Стекло', pricePerSqm: 12000 },
    },
    fittings: {
      soft_close: { name: 'Доводчики на двери', price: 8500 },
      lighting: { name: 'Встроенная подсветка', price: 18000 },
      full_extension: { name: 'Направляющие полного выдвижения', price: 6500 },
    },
    units: {
      shelf: { name: 'Полка', price: 2500 },
      drawer: { name: 'Ящик', price: 4500 },
      section: { name: 'Секция', price: 8000 },
    },
  },
};

function calcParametricPrice(productType, params) {
  const rules = PRICING_RULES[productType];
  if (!rules) return null;

  const w = params.width / 1000;
  const h = params.height / 1000;
  const d = params.depth / 1000;
  const frontArea = w * h;
  const sideArea = d * h * 2;
  const topArea = w * d * 2;

  const bodyArea = frontArea + sideArea + topArea;

  const material = rules.materials[params.material] || rules.materials.ldsp_white;
  const facade = rules.facades[params.facade] || rules.facades.ldsp;

  const bodyCost = bodyArea * material.pricePerSqm;
  const facadeCost = frontArea * facade.pricePerSqm;
  const shelvesCost = (params.shelves || 0) * rules.units.shelf.price;
  const drawersCost = (params.drawers || 0) * rules.units.drawer.price;
  const sectionsCost = (params.sections || 1) * rules.units.section.price;

  let fittingsCost = 0;
  if (params.fittings) {
    for (const f of params.fittings) {
      const fit = rules.fittings[f];
      if (fit) fittingsCost += fit.price;
    }
  }

  const complexityBase = 1.0;
  const items = [
    { label: 'Корпус (' + material.name + ')', value: bodyCost, modifier: bodyCost, type: 'formula' },
    { label: 'Фасады (' + facade.name + ')', value: facadeCost, modifier: facadeCost, type: 'formula' },
  ];

  if (params.shelves > 0) {
    items.push({ label: 'Полки (' + params.shelves + ' шт.)', value: shelvesCost, modifier: shelvesCost, type: 'formula' });
  }
  if (params.drawers > 0) {
    items.push({ label: 'Ящики (' + params.drawers + ' шт.)', value: drawersCost, modifier: drawersCost, type: 'formula' });
  }
  if (params.sections > 0) {
    items.push({ label: 'Секции (' + params.sections + ' шт.)', value: sectionsCost, modifier: sectionsCost, type: 'formula' });
  }
  if (fittingsCost > 0) {
    items.push({ label: 'Фурнитура', value: fittingsCost, modifier: fittingsCost, type: 'formula' });
  }

  const total = Math.round((bodyCost + facadeCost + shelvesCost + drawersCost + sectionsCost + fittingsCost) * complexityBase);

  return { items, total, material, facade };
}

function getParametricDefaultConfig(productType) {
  const rules = PRICING_RULES[productType];
  if (!rules) return {};
  const dims = rules.dimensions;
  return {
    width: dims.width.default,
    height: dims.height.default,
    depth: dims.depth.default,
    material: Object.keys(rules.materials)[0],
    facade: Object.keys(rules.facades)[0],
    sections: 2,
    shelves: 3,
    drawers: 1,
    fittings: [],
  };
}

function getDimensionConstraints(productType) {
  const rules = PRICING_RULES[productType];
  return rules ? rules.dimensions : null;
}
