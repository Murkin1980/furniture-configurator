# Конфигуратор мебели

Визуальный конфигуратор мебели с переключением 8 ракурсов, выбором опций, расчётом цены, хранением конфигурации в URL и отправкой заказа в WhatsApp.

**Демо:** https://murkin1980.github.io/furniture-configurator/

## Быстрый старт

Откройте `index.html` в браузере (Live Server или просто файлом).

## Возможности

- 8 ракурсов просмотра товара с навигацией (кнопки, клавиши, свайп)
- Выбор материала, цвета, ножек, размера
- Автоматическое обновление URL при изменении опций
- Восстановление конфигурации из URL (deep-link)
- Расчёт цены с разбивкой (базовая + надбавки)
- Копирование ссылки на текущую конфигурацию
- Отправка заказа в WhatsApp с полным описанием

## Добавление нового товара

1. Откройте `src/config.js`
2. Добавьте объект в массив `PRODUCTS`

```js
{
  id: 'my-product',
  name: 'Название товара',
  sku: 'ART-001',
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

### Зависимости опций

```js
dependsOn: { option: 'material', values: { fabric: ['ivory', 'grey'], 'eco-leather': ['black'] } }
availableFor: ['fabric', 'eco-leather']
```

### Изображения

WebP-рендеры в `products/{product-id}/images/{angle}-{material}-{color}-{legs}-{size}.webp`

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
index.html                — точка входа
src/
  config.js               — данные товаров и цены
  schema.js               — валидация схемы товара
  urlSerializer.js        — сериализация конфига в URL
  imageResolver.js        — путь к WebP по конфигу
  viewer.js               — компонент просмотра (8 ракурсов)
  viewer.css              — стили просмотрщика
  options.js              — панель выбора опций
  options.css             — стили опций
  price.js                — отображение цены с разбивкой
  price.css               — стили цены
  whatsapp.js             — интеграция с WhatsApp
  demo-art.js             — демо-SVG для тестирования (8 ракурсов)
docs/
  naming-convention.md    — система именования WebP
  gemini-bot-instruction.md — инструкция для Gemini-бота
```

## Проверка Lighthouse

Для достижения > 85 по mobile:
- WebP-изображения оптимизированы
- Шрифт Inter загружается через preconnect
- Скрипты и стили разделены по модулям
- Адаптивные изображения через aspect-ratio
- Минимум перерасчёта layout
