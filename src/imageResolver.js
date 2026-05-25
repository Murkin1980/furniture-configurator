function imageResolver(config, angle) {
  const productId = config.product || 'sofa-classic';
  const product = typeof getProduct === 'function' ? getProduct(productId) : null;

  if (product?.exampleImage) {
    return product.exampleImage;
  }

  const material = config.material || 'fabric';
  const color = config.color || 'ivory';
  const legs = config.legs || 'wood';
  const size = config.size || '2seat';

  const fileName = `${angle}-${material}-${color}-${legs}-${size}.webp`;
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
