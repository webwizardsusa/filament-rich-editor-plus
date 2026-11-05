<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks\Micro;

use PhpBench\Attributes\BeforeMethods;
use Webwizardsusa\RichEditorPlus\Content\ContentSchema;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;

#[BeforeMethods('setUp')]
class SchemaBench extends MicroBench
{
    public function setUp(): void
    {
        $this->boot();
    }

    public function benchFromRegistry(): void
    {
        ContentSchema::fromRegistry(PluginRegistry::make($this->plugins));
    }
}
