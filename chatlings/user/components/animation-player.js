/**
 * Animation Player Component
 * Randomly selects and plays animations from a specified folder
 * Supports video (mp4, webm) and image sequences
 */

class AnimationPlayer {
    constructor(animationFolder, onComplete) {
        this.animationFolder = animationFolder;
        this.onComplete = onComplete;
        this.animations = [];
    }

    /**
     * Fetch list of available animations in the folder
     */
    async loadAnimationList() {
        try {
            // For now, we'll hardcode known animations
            // In future, could use an API endpoint to list files
            const knownAnimations = {
                'dailybox': ['dailybox_1.mp4', 'dailybox_2.mp4']
            };

            this.animations = knownAnimations[this.animationFolder] || [];

            if (this.animations.length === 0) {
                console.warn(`No animations found for folder: ${this.animationFolder}`);
            }

            return this.animations;
        } catch (error) {
            console.error('Error loading animation list:', error);
            return [];
        }
    }

    /**
     * Select a random animation from available ones
     */
    selectRandomAnimation() {
        if (this.animations.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * this.animations.length);
        return this.animations[randomIndex];
    }

    /**
     * Get the URL for the animation
     * For dailybox animations, use blob storage directly
     * For other animations, use the artwork URL helper
     */
    getAnimationUrl(fileName) {
        if (this.animationFolder === 'dailybox') {
            // Daily box animations are stored in Azure blob storage
            const ANIMATIONS_BASE_URL = 'https://chatlingsdevlyg7hq.blob.core.windows.net/animations';
            return `${ANIMATIONS_BASE_URL}/dailybox/${fileName}`;
        }

        // Other animations use the artwork folder
        return getArtworkUrl(`animation/${fileName}`);
    }

    /**
     * Play the animation
     */
    async play(containerElement) {
        await this.loadAnimationList();

        const selectedAnimation = this.selectRandomAnimation();
        if (!selectedAnimation) {
            console.error('No animation available to play');
            if (this.onComplete) this.onComplete();
            return;
        }

        const animationUrl = this.getAnimationUrl(selectedAnimation);
        console.log(`Playing animation: ${selectedAnimation}`);

        // Create video element
        const video = document.createElement('video');
        video.autoplay = true;
        video.muted = false; // Allow sound if animation has it
        video.playsInline = true;

        // Handle animation completion
        video.addEventListener('ended', () => {
            console.log('Animation completed');
            if (this.onComplete) {
                this.onComplete();
            }
        });

        // Handle errors
        video.addEventListener('error', (e) => {
            console.error('Error playing animation:', e);
            if (this.onComplete) {
                this.onComplete();
            }
        });

        // Set source and append to container
        video.src = animationUrl;
        containerElement.innerHTML = '';
        containerElement.appendChild(video);
    }
}

// Export for use in other scripts
window.AnimationPlayer = AnimationPlayer;
