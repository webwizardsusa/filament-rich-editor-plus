# Rich Editor Plus

A Filament rich editor whose content is extended by plugins. This glossary covers its image terms.

## Language

**Image**, **Image Style**, **Variant**, **Usage**, **Visibility**:
As in Laravel Image Cache's glossary. An Image is an original stored once; a Variant is that Image rendered in one
Image Style.

**Placement**:
One use of an Image within a piece of content, with its own Image Style, alt text, caption, alignment and width. The
same Image can be placed many times, in different content or the same, each Placement described differently.
_Avoid_: Embed, image block, insertion

**External image**:
An image in content that is linked by URL rather than stored. It has no Image Style and is never tracked.
_Avoid_: Remote image, hotlink

**Width**:
How wide an image is laid out in the content, as a share of the column. It's separate from the Image Style, which
decides the file that's served.
_Avoid_: Size (for either)
