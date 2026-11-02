<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Micro;

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use PhpBench\Attributes\BeforeMethods;

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
