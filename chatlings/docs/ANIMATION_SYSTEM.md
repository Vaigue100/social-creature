# Animation Management System

## Overview

The animation management system allows you to upload, categorize, and manage multiple animation clips for each creature through a web-based admin interface. Animations are organized by type and can be displayed on creature pages or triggered by specific events.

**Key Feature:** Works seamlessly in both local development and Azure deployment - no need to access server file systems directly!

## Animation Types

The system includes these predefined animation types:

- **pose** - Creature posing/showing off (displayed on creature view page, random selection)
- **idle** - Creature idle/waiting animation (random selection)
- **happy** - Creature happy/excited animation (random selection)
- **leaving** - Creature leaving/running away animation (specific, shown when chatling is unhappy)
- **arriving** - Creature arriving/appearing animation (specific)
- **sad** - Creature sad/disappointed animation (random selection)
- **celebration** - Creature celebrating animation (random selection)
- **interact** - Creature interacting with user (random selection)

Types marked as "random selection" will show a different animation each time. Others will always show the same one (or the most recently added).

## How to Use

### 1. Access the Animation Manager

Navigate to the admin panel:
```
Local: http://localhost:3000/admin/manage-animations.html
Azure: https://your-app.azurewebsites.net/admin/manage-animations.html
```

Or click "Manage Animations" from the main admin page.

### 2. Upload Animations

1. Find the creature you want to add an animation for (use search if needed)
2. Click the "Upload Animation" button on the creature card
3. In the modal dialog:
   - Select the animation type (pose, leaving, idle, etc.)
   - Optionally provide a display name
   - Click or drag-and-drop your video file (.mp4, .webm, or .mov)
   - Preview the video to confirm
   - Click "Upload Animation"

The file will be automatically uploaded, stored, and added to the database!

### 3. View Existing Animations

When you open the upload modal for a creature, you'll see a list of all existing animations at the bottom. This helps you see what's already uploaded and avoid duplicates.

## For Developers: Frontend Integration

### Get all animations for a creature

```javascript
GET /api/creatures/{creatureId}/animations

Response:
{
  "pose": {
    "type_key": "pose",
    "type_name": "Pose",
    "is_random": true,
    "animations": [
      {
        "id": "uuid",
        "file_path": "/animations/processed/creature_pose_123.mp4",
        "file_name": "creature_pose_123.mp4",
        "display_name": "Happy Pose",
        "duration_seconds": 3.5
      }
    ]
  },
  "leaving": { ... }
}
```

### Get a specific animation for display

```javascript
GET /api/creatures/{creatureId}/animations/{animationType}

// Automatically handles random vs specific based on type configuration
// For "pose" type, returns a random pose animation
// For "leaving" type, returns the specific leaving animation

Response:
{
  "id": "uuid",
  "animation_type": "pose",
  "file_path": "/animations/processed/creature_pose_123.mp4",
  "file_name": "creature_pose_123.mp4",
  "display_name": "Happy Pose",
  "duration_seconds": 3.5
}
```

### Frontend Integration Example

```javascript
// On creature view page, load a pose animation
async function loadPoseAnimation(creatureId) {
  const response = await fetch(`/api/creatures/${creatureId}/animations/pose`);

  if (response.ok) {
    const animation = await response.json();

    const video = document.createElement('video');
    video.src = animation.file_path;
    video.autoplay = true;
    video.loop = true;
    document.getElementById('animation-container').appendChild(video);
  } else {
    // No animation available, show static image instead
    console.log('No pose animation for this creature');
  }
}

// When chatling leaves (unhappy)
async function playLeavingAnimation(creatureId) {
  const response = await fetch(`/api/creatures/${creatureId}/animations/leaving`);

  if (response.ok) {
    const animation = await response.json();

    const video = document.createElement('video');
    video.src = animation.file_path;
    video.autoplay = true;
    video.onended = () => {
      // Animation finished, remove creature from view
      removeCreatureFromView();
    };

    document.getElementById('animation-container').appendChild(video);
  }
}
```

## Database Schema

### creature_animations table

```sql
CREATE TABLE creature_animations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creature_id UUID NOT NULL REFERENCES creatures(id),
  animation_type VARCHAR(50) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  duration_seconds DECIMAL(5,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### animation_types table

```sql
CREATE TABLE animation_types (
  type_key VARCHAR(50) PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_random_selection BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## File Structure

```
chatlings/
├── animations/
│   └── processed/        # All uploaded animations stored here
├── services/
│   └── animation-service.js    # Retrieves animations for display
├── admin/
│   └── manage-animations.html   # Admin UI for uploads
└── scripts/
    ├── sql/
    │   └── 40_creature_animations.sql
    └── run-migration-40.js
```

## API Endpoints

### Admin Endpoints

- `GET /api/animation-types` - Get all animation type definitions
- `POST /api/animations/upload` - Upload animation file (multipart/form-data)

### Frontend Endpoints

- `GET /api/creatures/:creatureId/animations` - Get all animations for a creature
- `GET /api/creatures/:creatureId/animations/:animationType` - Get specific animation for display

## Upload API Details

The upload endpoint accepts `multipart/form-data` with:

**Fields:**
- `creatureId` (string, required) - The creature UUID
- `animationType` (string, required) - The animation type key
- `displayName` (string, optional) - Display name for the animation
- `animation` (file, required) - The video file

**File Requirements:**
- Accepts: .mp4, .webm, .mov
- Max size: 100MB
- Only video MIME types allowed

**Response:**
```json
{
  "success": true,
  "animationId": "uuid",
  "filePath": "/animations/processed/filename.mp4",
  "fileName": "filename.mp4"
}
```

**Automatic Processing:**
1. File is uploaded and validated
2. File is renamed to: `{creatureId}_{animationType}_{timestamp}.ext`
3. File is stored in `animations/processed/`
4. Database entry is created
5. If any step fails, uploaded file is automatically cleaned up

## Azure Deployment

The system works identically in Azure:

1. **Local development:** Files stored in local `chatlings/animations/processed/`
2. **Azure deployment:** Files stored in Azure App Service's persistent storage

**Note:** If you need to use Azure Blob Storage for large-scale deployments, the upload endpoint can be modified to use the Azure Storage SDK instead of local file system. The admin UI remains the same.

## Adding New Animation Types

To add a new animation type:

```sql
INSERT INTO animation_types (type_key, display_name, description, is_random_selection, display_order)
VALUES ('new_type', 'New Type', 'Description here', true, 9);
```

Set `is_random_selection` to:
- `true` - Pick random animation from this category each time
- `false` - Always use the same/most recent animation

## Services

### AnimationService

Methods:
- `getCreatureAnimations(creatureId)` - Get all animations grouped by type
- `getAnimationForDisplay(creatureId, animationType)` - Get animation to display (handles random/specific)
- `getRandomAnimation(creatureId, animationType)` - Force random selection
- `getSpecificAnimation(creatureId, animationType)` - Get most recent one
- `hasAnimations(creatureId, animationType)` - Check if animations exist
- `getAnimationTypes()` - List all animation type definitions

## Technical Details

### File Upload Flow

1. User selects creature and animation file in admin UI
2. Form data (including file) sent via `multipart/form-data` POST to `/api/animations/upload`
3. Multer middleware processes the upload:
   - Validates file type (video only)
   - Generates unique filename with timestamp
   - Saves to `animations/processed/`
4. Database record created with file metadata
5. Success response returned to UI
6. UI shows success message and refreshes animation list

### Why Direct Upload?

The original design used a "dropbox" folder with a file watcher service. The new design is better because:

1. **Works everywhere:** Same interface for local dev and Azure
2. **No file system access needed:** Upload through web UI only
3. **Immediate feedback:** Know instantly if upload succeeded
4. **Better error handling:** Failed uploads are cleaned up automatically
5. **Simpler architecture:** No background watcher service needed
6. **Mobile friendly:** Could even upload from phone/tablet

## Security Considerations

- File type validation (video only)
- File size limit (100MB)
- Automatic cleanup on errors
- UUID-based file naming prevents collisions
- No user-supplied filenames used directly

## Troubleshooting

**Upload fails:**
- Check file size (must be < 100MB)
- Check file type (.mp4, .webm, .mov only)
- Check disk space on server
- Check database connection

**Animations don't display:**
- Verify file was uploaded (check `animations/processed/`)
- Check database has entry (`SELECT * FROM creature_animations WHERE creature_id = '...'`)
- Verify file path is accessible via browser
- Check static file serving is configured (`app.use('/animations', ...)`)
