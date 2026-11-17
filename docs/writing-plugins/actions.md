---
title: Actions
weight: 60
description: Open a Filament modal from a tool or block type, and send TipTap commands back to the editor.
---

Some tools need input before they can change the content: the link tool asks for a URL, the table block asks for a
size. Those tools open a Filament **action** on the field, and the action sends TipTap commands back to the editor
when it is submitted.

The round trip:

1. The tool or block type names the action with `action('name')`.
2. The browser opens it with the current selection, plus any arguments your JS registered for it with
   `registerActionArguments()`.
3. Your PHP `Action` fills its form from those arguments, validates the input, and calls
   `$component->runCommands([...], $arguments['editorSelection'])`.
4. The browser restores the selection and runs the commands on the editor.

The [Rich Editor Plus Code](docs:rich-editor-plus-code/introduction) plugin's "Highlight lines" action is a compact
example of all four steps; it is used below.

## The PHP action

Return the action from `getActions()`. Its name must match what the tool or block type names:

```php
namespace Acme\Code\Actions;

use Closure;
use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Support\Enums\Width;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\EditorCommand;

class HighlightLinesAction
{
    public const string NAME = 'highlightCodeLines';

    public static function make(): Action
    {
        return Action::make(self::NAME)
            ->label('Highlight lines')
            ->modalHeading('Highlight lines')
            ->modalWidth(Width::Small)
            ->fillForm(fn (array $arguments): array => [
                'lines' => $arguments['highlightLines'] ?? null,
            ])
            ->schema([
                TextInput::make('lines')
                    ->placeholder('2, 4-6')
                    ->maxLength(500)
                    ->rule(fn (): Closure => function (string $attribute, mixed $value, Closure $fail): void {
                        if (is_string($value) && preg_match('/^[\d,\s-]*$/', $value) !== 1) {
                            $fail('Use line numbers and ranges, such as 2, 4-6.');
                        }
                    }),
            ])
            ->action(function (array $arguments, array $data, RichEditorPlus $component): void {
                $component->runCommands(
                    [EditorCommand::make('updateAttributes', ['codeBlock', ['highlightLines' => $data['lines'] ?? null]])],
                    $arguments['editorSelection'] ?? null,
                );
            });
    }
}
```

```php
use Webwizardsusa\RichEditorPlus\Support\Tool;

public function getTools(): array
{
    return [
        Tool::make('highlightCodeLines')
            ->label('Highlight lines')
            ->icon('mdi-format-line-style')
            ->action(HighlightLinesAction::NAME)
            ->block()
            ->nodes(['codeBlock'])
            ->showWithCursor(),
    ];
}

public function getActions(): array
{
    return [HighlightLinesAction::make()];
}
```

- The action is mounted on the field, so its closures can type-hint `RichEditorPlus $component` along with Filament's
  usual `$arguments`, `$data` and `$livewire`.
- `$arguments` come from the browser. Treat them as untrusted input, as you would a request: the form's validation
  runs on `$data`, but anything you read straight from `$arguments` needs checking.
- Action names share one namespace per field with every other plugin's actions, so prefix yours if they are generic.

## Arguments from the editor

By default the action is mounted with one argument, `editorSelection`, the selection when the tool was clicked. To
start the form from the editor's state, register a resolver in your JS module under the action's name. It gets the
editor and returns extra arguments:

```js
export default function ({ registerExtension, registerActionArguments }) {
    registerExtension('acme/code-block', (options) => createCodeBlock(options))

    // The highlight lines modal starts from the lines of the block the cursor is in.
    registerActionArguments('highlightCodeLines', (editor) => ({
        highlightLines: editor.getAttributes('codeBlock').highlightLines ?? null,
    }))
}
```

The core link action does the same, reading the current link's `href` and `target` into `url` and
`shouldOpenInNewTab`.

## Sending commands back

`RichEditorPlus::runCommands(array $commands, ?array $editorSelection = null)` dispatches commands to this field's
editor in the browser. Each is an `EditorCommand`:

```php
use Webwizardsusa\RichEditorPlus\Support\EditorCommand;

EditorCommand::make('setLink', [['href' => $url, 'target' => '_blank']]);
EditorCommand::make('insertTable', [['rows' => 3, 'cols' => 3, 'withHeaderRow' => true]]);
```

- The name is a TipTap **chain** command: any command the editor's extensions add, including your own.
- The arguments are a list, spread into the command, so a command that takes one object needs it wrapped:
  `[['href' => $url]]`. They must be JSON-serializable.
- The browser restores `$editorSelection` first (pass back the `editorSelection` argument you were given), focuses the
  editor, and runs the commands in order as one chain, so they are one undo step.

Because the modal took focus away from the editor, the selection is what makes the commands land where the user was.
A command that must act on a whole mark from a cursor position can extend the selection first, as the link action
does with `EditorCommand::make('extendMarkRange', ['link'])`.

## Opening an action from JS

A tool or block type opens its action by itself. To open one from your own JS, for example from a click on a node
view, use `runAction()` from the [extension context](javascript.md#the-editor-context). It mounts the action with the
selection and the registered arguments, exactly as a tool would:

```js
registerExtension('acme/figure', (options, tiptap, { runAction }) =>
    tiptap.core.Node.create({
        name: 'figure',
        // ...
        addNodeView() {
            return () => {
                const dom = document.createElement('figure')
                dom.addEventListener('dblclick', () => runAction('editFigure'))

                return { dom }
            }
        },
    }),
)
```

## Actions in the More menu

A tool with `overflow()` and an `action()` appears in the More menu and opens the action, as the HTML source item
does. A block type with an `action()` opens it from the slash menu, as the table block does.
