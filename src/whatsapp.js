const WA_NUMBER = '77059164337';

function buildWhatsAppLink(config) {
  const product = getProduct(config.product);
  const breakdown = calcPriceBreakdown(config);
  const shareUrl = buildShareUrl(config);

  const lines = [
    `Здравствуйте! Меня интересует ${product.name}.`,
    '',
    'Моя конфигурация:',
  ];

  if (product.type === 'parametric') {
    lines.push(`- Габариты: ${config.width}×${config.height}×${config.depth} мм`);
    for (const opt of product.options) {
      if (opt.type === 'counter') {
        lines.push(`- ${opt.name}: ${config[opt.id] ?? 0}`);
      } else if (opt.type === 'multicheck' && Array.isArray(config[opt.id]) && config[opt.id].length > 0) {
        const names = config[opt.id].map((vid) => {
          const v = opt.values.find((o) => o.id === vid);
          return v ? v.name : vid;
        });
        lines.push(`- ${opt.name}: ${names.join(', ')}`);
      } else {
        const val = getOptionValue(product.id, opt.id, config[opt.id]);
        if (val) lines.push(`- ${opt.name}: ${val.name}`);
      }
    }
  } else {
    for (const opt of product.options) {
      const val = getOptionValue(product.id, opt.id, config[opt.id]);
      if (val) lines.push(`- ${opt.name}: ${val.name}`);
    }
  }

  lines.push('', `Сумма: ${formatPrice(breakdown.total, product.currency)}`);
  lines.push('', `Ссылка на конфигурацию: ${shareUrl}`);

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${WA_NUMBER}?text=${text}`;
}

function openWhatsApp(config) {
  const url = buildWhatsAppLink(config);
  window.open(url, '_blank');
}
