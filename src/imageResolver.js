function imageResolver(config, angle) {
  const productId = config.product || 'sofa-classic';
  const p = getProduct(productId);
  const params = [String(angle)];

  if (p.type === 'parametric') {
    params.push(config.material || 'ldsp_white');
    params.push(config.facade || 'ldsp');
    params.push(config.width || 1200);
    params.push(config.height || 2400);
    params.push(config.depth || 600);
  } else {
    params.push(config.material || 'fabric');
    params.push(config.color || 'ivory');
    params.push(config.legs || 'wood');
    params.push(config.size || '2seat');
  }

  const fileName = params.join('-') + '.webp';
  return `products/${productId}/images/${fileName}`;
}

function resolveAllAngles(config) {
  const angles = 8;
  return Array.from({ length: angles }, (_, i) => imageResolver(config, i));
}

function getAngleLabel(angle) {
  const labels = [
    'Вид спереди',
    'Передний правый угол',
    'Вид справа',
    'Задний правый угол',
    'Вид сзади',
    'Задний левый угол',
    'Вид слева',
    'Передний левый угол',
  ];
  return labels[angle] || `Ракурс ${angle + 1}`;
}
