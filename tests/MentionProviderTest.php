<?php

use Webwizardsusa\RichEditorPlus\Support\MentionItem;
use Webwizardsusa\RichEditorPlus\Support\MentionProvider;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

function resultIds(array $items): array
{
    return array_map(fn (MentionItem $item): string => $item->getId(), $items);
}

class FakePeopleMention extends MentionProvider
{
    protected string $trigger = '@';

    protected bool $allowsSpaces = true;

    public function search(string $query): array
    {
        return [MentionItem::make(7, 'Ada')->description('Engineering')->avatar('/ada.png')];
    }

    public function labels(array $ids): array
    {
        return ['7' => 'Ada', '8' => 'Not asked for'];
    }

    public function url(string $id, string $label): ?string
    {
        return "/people/{$id}";
    }
}

it('filters static items on the server', function (): void {
    $provider = MentionProvider::make('#')->items(['1' => 'Bug', '2' => 'Feature', '3' => 'debug']);

    expect(resultIds($provider->getResults('BUG')))->toBe(['1', '3'])
        ->and(resultIds($provider->getResults('')))->toBe(['1', '2', '3']);
});

it('normalises every shape a search can return', function (mixed $results): void {
    $provider = MentionProvider::make('@')->getSearchResultsUsing(fn (): mixed => $results);
    $items = $provider->getResults('a');

    expect($items[0])->toBeInstanceOf(MentionItem::class)
        ->and($items[0]->getId())->toBe('5')
        ->and($items[0]->getLabel())->toBe('Ada');
})->with([
    'id => label' => [[5 => 'Ada']],
    'collection' => [collect([5 => 'Ada'])],
    'items' => [[MentionItem::make(5, 'Ada')]],
    'collection of items' => [collect([MentionItem::make(5, 'Ada')])],
]);

it('gives a class and closures the same results', function (): void {
    $class = FakePeopleMention::make();

    expect($class->getTrigger())->toBe('@')
        ->and($class->getResults('a')[0]->toArray())->toBe([
            'id' => '7', 'label' => 'Ada', 'description' => 'Engineering', 'avatar' => '/ada.png',
        ]);
});

it('does not search below the minimum query length', function (): void {
    $searched = false;

    $provider = MentionProvider::make('@')->minQueryLength(2)->getSearchResultsUsing(function () use (&$searched): array {
        $searched = true;

        return [];
    });

    $provider->getResults('a');

    expect($searched)->toBeFalse();
});

it('enforces the limit even when a provider returns more', function (): void {
    $provider = MentionProvider::make('@')->limit(2)->items(['1' => 'a', '2' => 'a', '3' => 'a']);

    expect($provider->getResults(''))->toHaveCount(2);
});

it('caps results at 50 by default', function (): void {
    $provider = MentionProvider::make('@')->getSearchResultsUsing(fn (): array => array_fill(1, 80, 'x'));

    expect($provider->getResults(''))->toHaveCount(50);
});

it('gives the search callback the limit', function (): void {
    $limit = null;

    MentionProvider::make('@')->limit(7)->getSearchResultsUsing(function (string $query, int $max) use (&$limit): array {
        $limit = $max;

        return [];
    })->getResults('a');

    expect($limit)->toBe(7);
});

it('does not search a query over the maximum length', function (): void {
    $searched = [];
    $provider = MentionProvider::make('@')->maxQueryLength(5)->getSearchResultsUsing(function (string $query) use (&$searched): array {
        $searched[] = $query;

        return ['1' => 'x'];
    });

    expect($provider->getResults('abcdef'))->toBe([])
        ->and($provider->getResults('abcde'))->toHaveCount(1)
        ->and($searched)->toBe(['abcde']);
});

it('caps queries at 100 characters by default', function (): void {
    $provider = MentionProvider::make('@')->getSearchResultsUsing(fn (): array => ['1' => 'x']);

    expect($provider->getResults(str_repeat('a', 101)))->toBe([])
        ->and($provider->getResults(str_repeat('a', 100)))->toHaveCount(1);
});

it('only returns labels for the ids it was asked about', function (): void {
    expect(FakePeopleMention::make()->getLabels(['7']))->toBe(['7' => 'Ada']);
});

it('reads labels from items by default', function (): void {
    expect(MentionProvider::make('#')->items([1 => 'Bug', 2 => 'Feature'])->getLabels(['2']))->toBe(['2' => 'Feature']);
});

it('uses a closure for labels', function (): void {
    $provider = MentionProvider::make('@')->getLabelsUsing(fn (array $ids): array => array_fill_keys($ids, 'Ada'));

    expect($provider->getLabels(['1']))->toBe(['1' => 'Ada']);
});

it('formats labels with the trigger by default', function (): void {
    expect(MentionProvider::make('@')->formatLabel('Ada'))->toBe('@Ada')
        ->and(MentionProvider::make('[[')->displayFormat('[[:label]]')->formatLabel('Ada'))->toBe('[[Ada]]');
});

it('allows only safe URLs', function (string $url, ?string $expected): void {
    $provider = MentionProvider::make('@')->getUrlUsing(fn (): string => $url);

    expect($provider->getUrl('1', 'Ada'))->toBe($expected);
})->with([
    ['https://example.com/a', 'https://example.com/a'],
    ['http://example.com/a', 'http://example.com/a'],
    ['/users/1', '/users/1'],
    ['javascript:alert(1)', null],
    ['JaVaScRiPt:alert(1)', null],
    ["java\tscript:alert(1)", null],
    ['data:text/html,x', null],
    ['', null],
]);

it('has no URL unless one is defined', function (): void {
    expect(MentionProvider::make('@')->getUrl('1', 'Ada'))->toBeNull();
});

it('describes itself for the browser', function (): void {
    $config = FakePeopleMention::make()->minQueryLength(1)->searchPrompt('Find someone')->toJsConfig();

    expect($config)->toMatchArray([
        'trigger' => '@',
        'allowSpaces' => true,
        'minQueryLength' => 1,
        'displayFormat' => '@:label',
    ])->and($config['messages']['searchPrompt'])->toBe('Find someone')
        ->and($config['messages']['searching'])->not->toStartWith('rich-editor-plus::')
        ->and($config['messages']['noResults'])->not->toStartWith('rich-editor-plus::');
});

it('rejects triggers it cannot use', function (string $trigger): void {
    MentionProvider::make($trigger);
})->with(['', ' ', '/', '@ a'])->throws(InvalidArgumentException::class);
