---
title: Contributing
weight: 100
description: Report bugs, set up the package for development, and send pull requests.
---

Bug reports and pull requests are welcome on
[GitHub](https://github.com/webwizardsusa/filament-rich-editor-plus).

## Reporting a bug

Open an [issue](https://github.com/webwizardsusa/filament-rich-editor-plus/issues) and include:

- The versions of Rich Editor Plus, Filament, Laravel and PHP, and the browser if the problem is in the editor.
- The field's setup: the `RichEditorPlus::make()` chain and any plugins, cut down to the smallest version that still
  shows the bug.
- The steps to reproduce it, what you expected, and what happened instead, with any browser console errors or the
  exception and stack trace.
- For a bug in saving or rendering content, the stored content (JSON, HTML or Markdown) that shows it.

> [!IMPORTANT]
> Please don't open a public issue for a security problem. Email it to jamie@webwizardsusa.com instead.

## Setting up

```bash
git clone https://github.com/webwizardsusa/filament-rich-editor-plus.git
cd filament-rich-editor-plus
composer install
npm install
```

Run the tests:

```bash
vendor/bin/pest   # PHP
npm test          # the editor's JS (Vitest)
```

To try a change in the browser, put the package in a Laravel app with a Filament panel, at
`packages/rich-editor-plus`, and require it through a Composer path repository:

```json
"repositories": [
    { "type": "path", "url": "./packages/*" }
],
"require": {
    "webwizardsusa/filament-rich-editor-plus": "@dev"
}
```

From the package directory, `npm run dev` starts a Vite dev server that the field loads from, with hot reload. It
expects the app two directories up and writes `public/rich-editor-plus.hot` there. The optional plugins have their own
dev servers: `npm run dev:table`, `npm run dev:image` and `npm run dev:markdown`. Without a dev server, run
`npm run build`, then `php artisan filament:assets` in the app.

## Pull requests

- Branch from `main`, and keep each pull request to one change.
- Add or update tests: Pest tests in `tests/` for PHP, and Vitest tests in `tests/js/` for editor behaviour. Both
  suites must pass.
- If you changed anything under `resources/js` or `resources/css`, run `npm run build` and commit the rebuilt `dist/`.
  The package ships the built files.
- Format PHP with [Laravel Pint](https://laravel.com/docs/pint) and its default Laravel preset.
- Update these docs when you add or change an option, a plugin or a behaviour that users will notice.
- Write commit messages as [Conventional Commits](https://www.conventionalcommits.org/), for example
  `fix(markdown): keep task list state when pasting`.
