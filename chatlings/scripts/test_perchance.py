#!/usr/bin/env python3
"""
Simple test of Perchance API
"""

import asyncio
from perchance import ImageGenerator

async def test():
    print("Initializing ImageGenerator...")
    generator = ImageGenerator()

    print("Generating test image...")
    image_data = await generator.image(
        prompt="a cute cat figurine",
        negative_prompt="blurry"
    )

    print(f"Got image data: {len(image_data)} bytes")

    # Save test image
    with open("test_image.png", "wb") as f:
        f.write(image_data)

    print("Saved test image as test_image.png")

if __name__ == "__main__":
    asyncio.run(test())
