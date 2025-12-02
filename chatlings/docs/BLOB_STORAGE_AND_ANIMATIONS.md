# Blob Storage & Animations - Implementation Summary

## What's Been Changed

### 1. All Artwork Now Loads from Azure Blob Storage

**File:** `user/config.js`

Added `FORCE_BLOB_STORAGE: true` flag to always use Azure Blob Storage for all images and artwork, even when running locally. This lets you test the performance of loading assets from the cloud.

**URLs:**
- **Images:** `https://chatlingsdevlyg7hq.blob.core.windows.net/artwork/linked/{filename}`
- **Frames:** `https://chatlingsdevlyg7hq.blob.core.windows.net/artwork/frame/{filename}`
- **Animations:** `https://chatlingsdevlyg7hq.blob.core.windows.net/animations/processed/{filename}`

**Helper Functions:**
```javascript
getImageUrl(filename)      // Gets creature images from blob storage
getArtworkUrl(path)       // Gets frames and other artwork from blob storage
getAnimationUrl(filename) // Gets animation videos from blob storage
```

### 2. Animations Play on Click

**File:** `user/view-creature.html`

**Behavior:**
1. **Initial Load:** Shows static JPG image from blob storage
2. **On Click:** Plays animation video once
3. **After Playback:** Returns to static JPG image

**Implementation:**
- Added `<video>` element next to the `<img>` element
- Video is preloaded but hidden
- Click handler on image switches to video and plays
- Video `onended` event switches back to image

**Code Flow:**
```javascript
// 1. Load static image from blob storage
img.src = getImageUrl(data.selected_image);

// 2. Fetch available animations
const animations = await fetch(`/api/creatures/${creatureId}/animations`);

// 3. If animation exists, set up click-to-play
if (primaryAnimation) {
    video.src = getAnimationUrl(primaryAnimation.file_name);

    img.onclick = () => {
        img.style.display = 'none';
        video.style.display = 'block';
        video.play();
    };

    video.onended = () => {
        video.style.display = 'none';
        img.style.display = 'block';
    };
}
```

## Performance Testing

You can now test the performance difference between:
- **Local Storage:** Set `FORCE_BLOB_STORAGE: false` in `user/config.js`
- **Blob Storage:** Set `FORCE_BLOB_STORAGE: true` in `user/config.js` (current setting)

### Expected Performance:

**Local Storage:**
- ✅ Faster initial load (no network latency)
- ❌ Not scalable for production
- ❌ Requires large local storage

**Azure Blob Storage:**
- ✅ Globally distributed (fast from anywhere)
- ✅ Scalable (handles millions of files)
- ✅ Automatic CDN caching
- ⚠️ Slight network latency on first load
- ✅ Subsequent loads are very fast (cached)

### How to Test:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Open collections page** at http://localhost:3000/user/collections.html
3. **Click on a creature** to view it
4. **Observe:**
   - Image load time from blob storage
   - Animation playback performance
   - Return to static image after animation

## API Endpoints Used

### Get Creature Animations
```http
GET /api/creatures/{creatureId}/animations
```

**Response:**
```json
[
  {
    "id": 1,
    "creature_id": "uuid",
    "animation_type": "pose",
    "file_path": "/animations/processed/uuid_pose_timestamp.mp4",
    "file_name": "uuid_pose_timestamp.mp4",
    "display_name": "Pose Animation"
  }
]
```

### Get Specific Animation Type
```http
GET /api/creatures/{creatureId}/animations/{animationType}
```

Returns a single animation of the specified type (e.g., "pose", "idle", "action").

## Current Animation Inventory

You have 2 uploaded animations in blob storage:
1. `468d1e5a-45a4-4da2-9da8-6e745f6e7988_pose_1764479827238.mp4`
2. `a0df7dfb-7bf3-4778-b658-9057b4dd0a6a_pose_1764479722206.mp4`

These creatures will show a "Click to play animation" cursor when viewing them.

## Files Modified

### user/config.js
- Added `FORCE_BLOB_STORAGE: true`
- Added `ANIMATIONS_BASE_URL`
- Added `getAnimationUrl()` helper function
- Updated `getImageUrl()` and `getArtworkUrl()` to respect force flag

### user/view-creature.html
- Added `<video>` element for animation playback
- Updated image loading to use `getImageUrl()` helper
- Added animation loading and click-to-play logic
- Added video end event to return to static image

## Toggle Between Local and Blob Storage

To switch back to local storage (for comparison):

```javascript
// In user/config.js
const CONFIG = {
  FORCE_BLOB_STORAGE: false, // Change to false
  // ...
};
```

Then refresh the page and observe the difference in load times!

## Summary

✅ **All artwork loads from Azure Blob Storage**
✅ **Animations play on click, then return to static image**
✅ **Performance can be tested by toggling FORCE_BLOB_STORAGE flag**
✅ **Scalable architecture ready for production deployment**

The system is now optimized for cloud delivery with a great user experience!
