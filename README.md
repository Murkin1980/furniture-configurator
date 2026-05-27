# Конфигуратор мебели

Визуальный конфигуратор мебели с двумя типами товаров (простой + параметрический), переключением 8 ракурсов, расчётом цены по формулам, хранением конфигурации в URL и отправкой заказа в WhatsApp.

**Демо:** https://murkin1980.github.io/furniture-configurator/

**Валюта:** KZT

## Быстрый старт

Откройте `index.html` в браузере (Live Server или просто файлом).

## Возможности

- **Два типа товаров:** простой (диван с фиксированными опциями) и параметрический (шкаф с габаритами и формульным расчётом)
- **8 ракурсов** просмотра с навигацией (кнопки, клавиши ←/→, свайп)
- **Параметрический ввод габаритов:** слайдеры + числовые поля (ширина/высота/глубина)
- **Типы опций:** кнопки (`text`), цветовые свотчи (`color`), счётчики (`counter`), чекбоксы (`multicheck`)
- **Formula-based pricing engine:** расчёт по площади материалов, количеству полок/ящиков/секций и фурнитуре
- **Автоматическое обновление URL** при изменении конфигурации
- **Восстановление конфигурации** из URL (deep-link)
- **Копирование ссылки** на текущую конфигурацию
- **Отправка заказа в WhatsApp** с полным описанием (адаптировано под тип товара)
- **Переключатель товаров** без перезагрузки страницы

## Добавление нового товара

### Простой товар (фиксированные опции)

1. Откройте `src/config.js`
2. Добавьте объект в массив `PRODUCTS`

```js
{
  id: 'my-product',
  name: 'Название товара',
  sku: 'ART-001',
  type: 'simple',
  basePrice: 100000,
  currency: 'KZT',
  options: [
    {
      id: 'material',
      name: 'Материал',
      type: 'text',
      values: [
        { id: 'fabric', name: 'Ткань', priceModifier: 0, imageSuffix: 'fabric' },
      ],
    },
    {
      id: 'color',
      name: 'Цвет',
      type: 'color',
      values: [
        { id: 'ivory', name: 'Айвори', hex: '#FFFFF0', priceModifier: 0, imageSuffix: 'ivory' },
      ],
    },
  ],
}
```

#### Зависимости опций

```js
dependsOn: { option: 'material', values: { fabric: ['ivory', 'grey'], 'eco-leather': ['black'] } }
availableFor: ['fabric', 'eco-leather']
```

### Параметрический товар (габариты + формульный расчёт)

1. Добавьте объект в `PRODUCTS` в `src/config.js`
2. Добавьте правила материалов, фасадов и фурнитуры в `PRICING_RULES` в `src/pricing.js`

```js
{
  id: 'my-wardrobe',
  name: 'Мой шкаф',
  sku: 'MW-001',
  type: 'parametric',
  currency: 'KZT',
  paramGroup: 'wardrobe',     // ключ в PRICING_RULES
  options: [
    {
      id: 'material',
      name: 'Материал корпуса',
      type: 'text',
      values: [
        { id: 'ldsp_white', name: 'ЛДСП белый' },
      ],
    },
    {
      id: 'shelves',
      name: 'Полки',
      type: 'counter',
      min: 0, max: 20, default: 3,
    },
    {
      id: 'fittings',
      name: 'Фурнитура',
      type: 'multicheck',
      values: [
        { id: 'soft_close', name: 'Доводчики' },
      ],
    },
  ],
}
```

Правила расчёта в `src/pricing.js`:

```js
const PRICING_RULES = {
  wardrobe: {
    dimensions: {
      width: { min: 600, max: 3000, step: 10, default: 1200, label: 'Ширина' },
      height: { min: 400, max: 2800, step: 10, default: 2400, label: 'Высота' },
      depth: { min: 300, max: 1200, step: 10, default: 600, label: 'Глубина' },
    },
    materials: {
      ldsp_white: { name: 'ЛДСП белый', pricePerSqm: 4500 },
      // ...
    },
    facades: {
      mdf: { name: 'МДФ матовый', pricePerSqm: 7000 },
      // ...
    },
    fittings: {
      soft_close: { name: 'Доводчики на двери', price: 8500 },
      // ...
    },
    units: {
      shelf: { name: 'Полка', price: 2500 },
      drawer: { name: 'Ящик', price: 4500 },
      section: { name: 'Секция', price: 8000 },
    },
  },
};
```

Формула: `(площадь корпуса × цена_материала) + (площадь_фасадов × цена_фасада) + полки + ящики + секции + фурнитура`

### Изображения

Простой товар: `products/{product-id}/images/{angle}-{material}-{color}-{legs}-{size}.webp`

Параметрический товар: `products/{product-id}/images/{angle}-{material}-{facade}-{width}-{height}-{depth}.webp`

Для генерации изображений используйте Gemini-бота по инструкции `docs/gemini-bot-instruction.md`.

### Проверка

```js
validateProduct(PRODUCTS[PRODUCTS.length - 1])
```

## Конфигурация WhatsApp

Номер менеджера в `src/whatsapp.js`:

```js
const WA_NUMBER = '77059164337'; // +7 705 916 43 37
```

## Структура проекта

```
index.html                — точка входа (подключает все модули)
src/
  config.js               — данные товаров (sofa-classic, wardrobe)
  pricing.js              — pricing engine: формулы, цены материалов/фурнитуры
  schema.js               — валидация схемы товара
  urlSerializer.js        — сериализация конфига в URL (массивы, числа)
  imageResolver.js        — путь к WebP по конфигу (оба типа товаров)
  viewer.js               — компонент просмотра (8 ракурсов)
  viewer.css              — стили просмотрщика
  options.js              — панель выбора опций (dimensions, counter, multicheck)
  options.css             — стили опций
  price.js                — отображение цены с разбивкой
  price.css               — стили цены
  whatsapp.js             — интеграция с WhatsApp
  demo-art.js             — демо-SVG для тестирования (8 ракурсов)
docs/
  naming-convention.md    — система именования WebP
  gemini-bot-instruction.md — инструкция для Gemini-бота
products/
  sofa-classic/images/    — изображения дивана
  wardrobe/images/        — изображения шкафа-купе
```

## Проверка Lighthouse

Для достижения > 85 по mobile:
- WebP-изображения оптимизированы
- Шрифт Inter загружается через preconnect
- Скрипты и стили разделены по модулям
- Адаптивные изображения через aspect-ratio
- Минимум перерасчёта layout
