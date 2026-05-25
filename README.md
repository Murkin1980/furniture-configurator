# Конфигуратор мебели

Визуальный конфигуратор мебели с переключением ракурсов, выбором опций, расчётом цены и отправкой в WhatsApp.

## Быстрый старт

Откройте `index.html` в браузере (достаточно Live Server или просто файла).

## Добавление нового товара

1. Откройте `src/config.js`
2. Добавьте объект товара в массив `PRODUCTS`

### Структура товара

```js
{
  id: 'my-product',          // уникальный slug
  name: 'Название товара',    // отображаемое имя
  sku: 'ART-001',             // артикул
  basePrice: 100000,          // базовая цена
  currency: 'KZT',            // KZT | RUB | USD
  options: [
    {
      id: 'material',         // ID группы опций
      name: 'Материал',       // название группы
      type: 'text',           // 'text' | 'color'
      values: [
        {
          id: 'fabric',       // ID значения
          name: 'Ткань',      // название
          priceModifier: 0,   // надбавка к цене
          imageSuffix: 'fabric', // суффикс для WebP
          // для type: 'color' добавляется hex: '#FFFFF0'
        },
      ],
    },
  ],
}
```

### Опции с зависимостями

Если цвет зависит от материала, укажите:

```js
dependsOn: { option: 'material', values: { fabric: ['ivory', 'grey'], 'eco-leather': ['black', 'brown'] } }
```

И для каждого цвета — `availableFor: ['fabric', 'eco-leather']`.

### Изображения

Разместите WebP-рендеры товара в:

```
products/{product-id}/images/{angle}-{material}-{color}-{legs}-{size}.webp
```

См. `docs/naming-convention.md` для полного описания.

### Проверка

После добавления запустите в консоли браузера:

```js
validateProduct(PRODUCTS[PRODUCTS.length - 1])
```

## Структура проекта

```
index.html           — точка входа
src/
  config.js          — данные товаров
  schema.js          — схема и валидация
  urlSerializer.js   — конфигурация в URL и обратно
  imageResolver.js   — разрешение пути к WebP
docs/
  naming-convention.md — система именования файлов
```

## Этапы разработки

См. `furniture_configurator_roadmap.html` в корне проекта.
