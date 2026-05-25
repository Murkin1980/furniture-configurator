const WA_NUMBER = '77027904001';

function buildWhatsAppLink(config) {
  const product = getProduct(config.product);
  const breakdown = calcPriceBreakdown(config);
  const shareUrl = buildShareUrl(config);

  const lines = [
    `Здравствуйте! Меня интересует ${product.name}.`,
    '',
    'Моя конфигурация:',
  ];

  for (const opt of product.options) {
    const val = getOptionValue(product.id, opt.id, config[opt.id]);
    if (val) lines.push(`- ${opt.name}: ${val.name}`);
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
