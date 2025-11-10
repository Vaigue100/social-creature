# Trait Badges Component

A reusable, CSS-based component for displaying creature social trait scores with consistent styling across the application.

## Features

- ✅ **Consistent Styling** - Perfect visual consistency across all uses
- ✅ **Dynamic Loading** - Fetches trait scores from API automatically
- ✅ **Multiple Variants** - Default, compact, and inline layouts
- ✅ **Color Coding** - Optional color by score or by trait category
- ✅ **Interactive** - Hover tooltips and click handlers
- ✅ **Responsive** - Works on all screen sizes
- ✅ **Reusable** - Drop-in component for any page

## Quick Start

### 1. Include the CSS and JavaScript

```html
<link rel="stylesheet" href="/user/components/trait-badges.css">
<script src="/user/components/trait-badges.js"></script>
```

### 2. Add a container element

```html
<div id="creature-traits"></div>
```

### 3. Load and display badges

```javascript
TraitBadges.load('creature-id-here', 'creature-traits');
```

Done! The badges will automatically load and display.

## Usage Examples

### Basic Usage

```html
<div id="traits"></div>
<script>
  TraitBadges.load('creature-id', 'traits');
</script>
```

### Compact Variant

Perfect for mobile or tight spaces:

```javascript
TraitBadges.load('creature-id', 'traits', {
  variant: 'compact'
});
```

### Inline Variant

Horizontal scrolling, no wrapping:

```javascript
TraitBadges.load('creature-id', 'traits', {
  variant: 'inline'
});
```

### Color-Coded by Score

Red (low), Orange (medium), Green (high):

```javascript
TraitBadges.load('creature-id', 'traits', {
  colorByScore: true
});
```

### Sorted by Score

```javascript
TraitBadges.load('creature-id', 'traits', {
  sortBy: 'score-desc'  // or 'score-asc', 'name'
});
```

### Show Trait Names

```javascript
TraitBadges.load('creature-id', 'traits', {
  showName: true
});
```

### Manual Rendering

If you already have the trait data:

```javascript
const traits = [
  { icon: '😊', category_name: 'Friendliness', score: 85, description: 'How warm and welcoming' },
  // ... more traits
];

TraitBadges.render(traits, 'traits');
```

### With Click Handlers

```javascript
TraitBadges.load('creature-id', 'traits', {
  onClick: (trait) => {
    console.log(`Clicked ${trait.category_name}: ${trait.score}`);
    // Your custom logic here
  }
});
```

### Bulk Loading

Load traits for multiple creatures efficiently:

```javascript
const creatureIds = ['id1', 'id2', 'id3'];

TraitBadges.loadBulk(creatureIds, (creatureId, traits) => {
  TraitBadges.render(traits, `traits-${creatureId}`);
});
```

## API Reference

### TraitBadges.load(creatureId, containerId, options)

Load and display trait badges from the API.

**Parameters:**
- `creatureId` (string) - The creature UUID
- `containerId` (string) - DOM element ID to render into
- `options` (object, optional) - Configuration options

**Options:**
- `variant` (string) - Layout variant: 'compact', 'inline'
- `colorByScore` (boolean) - Color badges by score level
- `sortBy` (string) - Sort order: 'score-desc', 'score-asc', 'name'
- `showName` (boolean) - Show trait category names
- `showTooltip` (boolean) - Show hover tooltips (default: true)
- `onClick` (function) - Click handler: `(trait) => { }`
- `loadingText` (string) - Custom loading message
- `hideOnError` (boolean) - Hide container on error (default: true)

**Returns:** Promise<array> - The trait data, or null on error

### TraitBadges.render(traits, containerId, options)

Render badges from existing trait data.

**Parameters:**
- `traits` (array) - Array of trait objects
- `containerId` (string) - DOM element ID to render into
- `options` (object, optional) - Same as `load()`

### TraitBadges.createBadge(trait, options)

Create a single badge element.

**Parameters:**
- `trait` (object) - Trait data: `{ icon, category_name, score, description }`
- `options` (object, optional) - Configuration options

**Returns:** HTMLElement - The badge element

### TraitBadges.loadBulk(creatureIds, callback)

Load traits for multiple creatures in parallel.

**Parameters:**
- `creatureIds` (array) - Array of creature UUIDs
- `callback` (function) - Called with `(creatureId, traits)` for each

**Returns:** Promise<array> - Array of results

## Trait Data Format

The API returns traits in this format:

```json
[
  {
    "score": 85,
    "category_id": 1,
    "category_name": "Friendliness",
    "description": "How warm and welcoming they are, approachable and sociable",
    "icon": "😊"
  },
  // ... more traits
]
```

## CSS Classes

### Container Classes
- `.trait-badges` - Main container
- `.trait-badges.compact` - Compact variant
- `.trait-badges.inline` - Inline variant
- `.trait-badges-loading` - Loading state

### Badge Classes
- `.trait-badge` - Individual badge
- `.trait-badge-tooltip` - Badge with tooltip
- `.trait-badge.score-low` - Low score (0-34)
- `.trait-badge.score-medium` - Medium score (35-69)
- `.trait-badge.score-high` - High score (70-100)

### Element Classes
- `.trait-icon` - The emoji icon
- `.trait-score` - The score number
- `.trait-name` - The trait category name

## Category-Specific Colors

Each trait category has its own gradient color:

- **Friendliness** 😊 - Pink to Yellow
- **Playfulness** 🎮 - Light Blue to Blue
- **Creativity** 🎨 - Pink to Dark Pink
- **Empathy** 💝 - Red to Pink
- **Energy Level** ⚡ - Yellow to Pink
- **Confidence** 💪 - Cyan to Teal
- **Humor** 😄 - Green to Teal
- **Curiosity** 🔍 - Purple to Dark Purple

To use category-specific colors, badges automatically get `data-category` attributes.

## Styling Customization

Override CSS variables or classes to customize:

```css
/* Change gradient colors */
.trait-badge {
  background: linear-gradient(135deg, #yourcolor1 0%, #yourcolor2 100%);
}

/* Change badge size */
.trait-badge {
  padding: 10px 12px;
  min-width: 60px;
}

/* Change icon size */
.trait-icon {
  font-size: 1.5em;
}
```

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Tips

1. **Performance**: Use `loadBulk()` when loading many creatures at once
2. **Mobile**: Use `compact` variant for small screens
3. **Accessibility**: Tooltips provide context for screen readers
4. **Consistency**: Always use this component instead of custom badge HTML
5. **Error Handling**: Set `hideOnError: false` if you want to show error messages

## Examples in Production

### Collections Page
```javascript
// In collections.html
chatlings.forEach(chatling => {
  // ... create card HTML ...
  TraitBadges.load(chatling.creature_id, `traits-${chatling.creature_id}`);
});
```

### Interaction Results
```javascript
// Show traits after social interaction
TraitBadges.render(chatling1Traits, 'chatling-1-traits', { variant: 'compact' });
TraitBadges.render(chatling2Traits, 'chatling-2-traits', { variant: 'compact' });
```

### Comparison View
```javascript
// Side-by-side comparison with sorted scores
TraitBadges.load(creature1, 'left-traits', { sortBy: 'score-desc', colorByScore: true });
TraitBadges.load(creature2, 'right-traits', { sortBy: 'score-desc', colorByScore: true });
```

## API Endpoint

The component uses this endpoint:

```
GET /api/creature/:creatureId/traits
```

Returns an array of trait objects with scores and metadata.

## Troubleshooting

**Badges not appearing?**
- Check browser console for errors
- Verify creature ID is valid
- Ensure API endpoint is running
- Check that trait scores exist for the creature

**Styling looks wrong?**
- Make sure `trait-badges.css` is loaded
- Check for CSS conflicts with other stylesheets
- Verify container element exists before calling `load()`

**Tooltips not working?**
- Ensure `showTooltip` is not set to `false`
- Check that trait descriptions are present in the data

## Future Enhancements

Potential additions:
- [ ] Animated score changes
- [ ] Sparklines showing score history
- [ ] Comparison mode (side-by-side)
- [ ] Export as image
- [ ] Filter/search by trait
- [ ] Accessibility improvements

## License

Part of the Chatlings project.
