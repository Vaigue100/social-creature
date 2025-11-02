#!/usr/bin/env python3
"""
Quick test to check CSV file format
"""
import csv
from pathlib import Path

QUEUE_FILE = Path(__file__).parent.parent / 'artwork' / 'creature_prompts_queue.csv'

print(f"Checking CSV file: {QUEUE_FILE}")
print(f"File exists: {QUEUE_FILE.exists()}\n")

if QUEUE_FILE.exists():
    with open(QUEUE_FILE, 'r', encoding='utf-8') as f:
        # Read first line (headers)
        first_line = f.readline()
        print(f"Headers: {first_line.strip()}")
        print()

        # Reset and use DictReader
        f.seek(0)
        reader = csv.DictReader(f)

        print(f"DictReader fieldnames: {reader.fieldnames}")
        print()

        # Read first creature
        first_creature = next(reader)
        print("First creature keys:", list(first_creature.keys()))
        print()
        print("First creature data:")
        for key, value in first_creature.items():
            if len(value) > 100:
                print(f"  {key}: {value[:100]}...")
            else:
                print(f"  {key}: {value}")

        # Count total
        f.seek(0)
        reader = csv.DictReader(f)
        total = sum(1 for _ in reader)
        print(f"\nTotal creatures in CSV: {total}")
else:
    print("[ERROR] CSV file not found!")
    print("Make sure you've run: git pull")
    print(f"Expected location: {QUEUE_FILE}")
