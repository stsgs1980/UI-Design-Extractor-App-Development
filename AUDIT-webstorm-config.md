# Аудит: UI Design Extractor vs webstorm-config

Сравнение проекта с правилами шаблона [webstorm-config](https://github.com/stsgs1980/webstorm-config).
Дата: 2025-10-22.

---

## Общая оценка

| Категория           | Счёт |
|---------------------|------|
| Полных совпадений   | 5    |
| Частичных совпадений| 4    |
| Нарушений           | 10   |

**Вердикт:** проект частично следует стандартам. Основные проблемы -- ESLint-плагины, размер файлов, console.log, JSDoc, отсутствующие конфиги.

---

## Что хорошо (соответствует правилам)

### 1. Prettier настроен правильно
- `semi: true`, `singleQuote: false`, `tabWidth: 2`, `trailingComma: "all"`
- Плагин `prettier-plugin-tailwindcss` подключен
- `endOfLine: "lf"` -- соответствует правилу LF
- `printWidth: 100` (шаблон требует 120, но 100 строже -- это нормально)

### 2. TypeScript strict mode
- `strict: true` в tsconfig.json
- `esModuleInterop`, `skipLibCheck`, `forceConsistentCasingInFileNames`, `resolveJsonModule`, `isolatedModules` -- все включены

### 3. React Hooks правила
- `react-hooks/exhaustive-deps: "warn"` -- настроено
- Плагин подключен в ESLint

### 4. Unicode / Emoji политика
- Кастомный плагин `eslint-rules/unicode-policy.mjs` подключен
- `unicode-policy/emoji: "error"` и `unicode-policy/unicode-graphics: "error"` -- работают
- В исходниках emoji не найдено

### 5. Husky pre-commit hook
- `.husky/pre-commit` существует
- Запускает проверку длины строк, ESLint, Prettier, TypeScript

---

## Что нарушено (не соответствует правилам)

### 1. Анти-монолит: 10 файлов превышают 250 строк [HIGH]

| Строк | Файл                                                        | Превышение |
|------:|-------------------------------------------------------------|-----------:|
|   726 | `src/components/ui/sidebar.tsx`                             |       +476 |
|   556 | `src/components/extractor/extract-view.tsx`                 |       +306 |
|   468 | `src/components/extractor/dashboard-view.tsx`               |       +218 |
|   377 | `src/components/extractor/references-view.tsx`              |       +127 |
|   353 | `src/components/ui/chart.tsx`                               |       +103 |
|   276 | `src/lib/pipeline-steps.ts`                                 |        +26 |
|   276 | `src/components/ui/menubar.tsx`                             |        +26 |
|   265 | `src/components/extractor/log-viewer.tsx`                   |        +15 |
|   257 | `src/components/ui/dropdown-menu.tsx`                       |         +7 |
|   252 | `src/components/ui/context-menu.tsx`                        |         +2 |

> Примечание: файлы `src/components/ui/` -- сгенерированные shadcn/ui, их рефакторинг
> нежелателен. Кандидаты на декомпозицию: `extract-view.tsx`, `dashboard-view.tsx`,
> `references-view.tsx`, `pipeline-steps.ts`.

### 2. ESLint: отсутствуют ключевые плагины [HIGH]

| Правило                                                      | Статус    | Влияе                       |
|--------------------------------------------------------------|-----------|-----------------------------|
| `@typescript-eslint/explicit-function-return-type`           | Отсутствует| Функции без возвр. типа     |
| `jsx-a11y` (alt-text, anchor-is-valid, label-has-control)    | Отсутствует| Недоступный UI              |
| `jsdoc/require-jsdoc`                                        | Отсутствует| Нет JSDoc на публичных API  |
| `no-console`                                                 | `warn`    | console.log не блокируется  |

### 3. 50 вызовов console.log в src/ [HIGH]

Правило: `no-console: ["error", { allow: ["warn", "error"] }]`. Допускаются только
`console.warn` и `console.error`.

| Файл                         | console.log | console.warn | console.error |
|------------------------------|------------:|-------------:|--------------:|
| `pipeline-steps.ts`          |          13 |            2 |             5 |
| `pipeline/route.ts`          |           8 |            6 |             4 |
| `projects/route.ts`          |           8 |            2 |             4 |
| `projects/[id]/route.ts`     |           5 |            2 |             2 |
| `extract-view.tsx`           |           6 |            0 |             5 |
| `dashboard-view.tsx`         |           3 |            0 |             2 |
| `app-sidebar.tsx`            |           3 |            0 |             2 |
| Остальные (4 файла)          |           4 |            2 |             6 |

**Решение:** заменить `console.log` на `console.warn` (или удалить, если логирование не нужно).

### 4. JSDoc: 83% экспортируемых функций без документации [HIGH]

Из 90 экспортируемых функций только 15 имеют JSDoc. Правило требует JSDoc на всех
публичных API (экспортируемые функции, методы, React-компоненты).

### 5. Conventional Commits: 60% коммитов не соответствуют формату [HIGH]

12 из 20 последних коммитов -- UUID без типа/скопа:

```
3833e95d-a345-455e-9343-3290f6238cae    # Должен быть: feat(scope): description
4d30a6f3-ddae-47c6-8495-e884ab14cf97    # Должен быть: fix(scope): description
```

Допустимые типы: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`.

### 6. TypeScript config: 3 отклонения [MEDIUM]

| Настройка            | Ожидается | Фактически |
|----------------------|-----------|-----------|
| `noUnusedLocals`     | `true`    | Не задано |
| `noUnusedParameters` | `true`    | Не задано |
| `target`             | `ES2022`  | `ES2017`  |

### 7. `any` type: 1 использование [LOW]

`src/lib/pipeline-steps.ts:76` -- `let parsed: any`. Правило запрещает `any`,
следует заменить на типизованную структуру.

---

## Отсутствующие файлы конфигурации [HIGH]

8 из 12 ожидаемых файлов отсутствуют:

| Файл                          | Назначение                                     | Приоритет |
|-------------------------------|------------------------------------------------|----------|
| `.stylelintrc.json`           | Линтинг CSS/SCSS + Tailwind v4 at-rules        | 1        |
| `.markdownlint.json`          | Линтинг .md файлов (120 chars, aligned tables) | 2        |
| `.editorconfig`               | Единый стиль отступов/переносов для всех IDE   | 3        |
| `.gitattributes`              | LF line endings для скриптов, binary для картинок| 4       |
| `.nvmrc`                      | Фиксация версии Node.js                        | 5        |
| `.aiassistant/rules/AI Rules.md` | Правила для AI-ассистентов                  | 6        |
| `SECURITY.md`                 | Политика безопасности                           | 7        |
| `CHANGELOG.md`                | Автогенерируемый из conventional commits        | 8        |

---

## Что можно перенять (рекомендации)

### Приоритет 1: Критическое (в первую очередь)

1. **`.stylelintrc.json`** -- скопировать из шаблона. Tailwind v4 at-rules уже
   настроены. Без stylelint ошибки в CSS не ловятся.

2. **Замена console.log на console.warn** -- массовая замена в `src/lib/` и
   `src/app/api/`. Минимальные усилия, максимум пользы.

3. **`no-console: "error"`** в ESLint -- сменить warn на error, добавить
   `allow: ["warn", "error"]`.

4. **`.markdownlint.json`** -- скопировать из шаблона. Добавить `npm run lint:md`.

### Приоритет 2: Важное (на следующей итерации)

5. **`.editorconfig`** -- гарантия единого стиля в любой IDE:
   ```ini
   root = true
   [*]
   indent_style = space
   indent_size = 2
   end_of_line = lf
   charset = utf-8
   trim_trailing_whitespace = true
   insert_final_newline = true
   ```

6. **`.gitattributes`** -- LF для скриптов, binary для .png/.jpg. Скопировать из шаблона.

7. **tsconfig: noUnusedLocals + noUnusedParameters** -- включить, удалить
   неиспользуемые переменные.

8. **tsconfig: target ES2022** -- проект работает в Node.js 18+, ES2022 безопасен.

9. **Декомпозиция файлов >250 строк** -- начать с `extract-view.tsx` (556 строк):
   - Вынести `startPipelineAndPoll` в хук `usePipeline()`
   - Вынести UI-секции в подкомпоненты

10. **eslint-plugin-jsx-a11y** -- добавить в devDependencies, включить `alt-text`,
    `anchor-is-valid`, `label-has-associated-control`.

### Приоритет 3: Желательное (улучшение качества)

11. **jsdoc/require-jsdoc** -- добавить в ESLint. Начать с публичных API в `lib/` и `types/`.

12. **@typescript-eslint/explicit-function-return-type** -- добавить в ESLint.
    Строгая типизация возвращаемых значений.

13. **`.nvmrc`** -- зафиксировать текущую версию Node.js.

14. **Conventional Commits** -- добавить `@commitlint/cli` +
    `@commitlint/config-conventional` в devDependencies. Настроить `.husky/commit-msg`.

15. **`.aiassistant/rules/AI Rules.md`** -- скопировать из шаблона, адаптировать под проект.

16. **CHANGELOG.md** -- добавить `conventional-changelog`, скрипт `npm run changelog`.

17. **SECURITY.md** -- скопировать из шаблона, адаптировать.

18. **Vitest** -- vitest.config.ts уже есть, но тестов нет. Начать с unit-тестов для
    `parse-utils.ts`.

### Приоритет 4: Низкий (когда будет время)

19. **`any` -> тип** -- заменить `let parsed: any` в pipeline-steps.ts на интерфейс.

20. **lint-staged** как зависимость -- pre-commit вызывает `npx lint-staged`, но пакет
    не установлен.

---

## Сводная таблица

| #  | Проверка                            | Результат         | Важность |
|----|-------------------------------------|-------------------|----------|
| 1  | Prettier                            | OK                | -        |
| 2  | TS strict mode                      | OK                | -        |
| 3  | React Hooks ESLint                  | OK                | -        |
| 4  | Unicode/Emoji политика              | OK                | -        |
| 5  | Husky pre-commit                    | OK                | -        |
| 6  | Анти-монолит (250 строк)            | 10 нарушений      | HIGH     |
| 7  | ESLint: explicit-function-return-type| Отсутствует      | HIGH     |
| 8  | ESLint: jsx-a11y                    | Отсутствует       | HIGH     |
| 9  | ESLint: jsdoc/require-jsdoc         | Отсутствует       | HIGH     |
| 10 | ESLint: no-console as error         | warn, не error    | MEDIUM   |
| 11 | tsconfig: noUnusedLocals            | Не задано         | MEDIUM   |
| 12 | tsconfig: target ES2022             | ES2017            | MEDIUM   |
| 13 | Отсутствующие конфиги              | 8 из 12           | HIGH     |
| 14 | Conventional Commits                | 60% не соответствуют| HIGH    |
| 15 | console.log вызовы                  | 50 шт.            | HIGH     |
| 16 | JSDoc на экспортах                  | 83% без JSDoc     | HIGH     |
| 17 | Stylelint                           | Не настроен       | HIGH     |
| 18 | `any` type                          | 1 использование   | LOW      |
