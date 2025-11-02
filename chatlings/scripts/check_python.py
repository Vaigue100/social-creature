#!/usr/bin/env python3
"""
Diagnostic script to check Python and package installations
"""

import sys
import subprocess

print("=" * 80)
print("Python Environment Diagnostics")
print("=" * 80)
print()

# Show Python version and location
print(f"Python executable: {sys.executable}")
print(f"Python version: {sys.version}")
print()

# Show pip location
try:
    result = subprocess.run([sys.executable, "-m", "pip", "--version"],
                          capture_output=True, text=True)
    print(f"Pip version: {result.stdout.strip()}")
except Exception as e:
    print(f"Error checking pip: {e}")
print()

# Check installed packages
print("Checking installed packages:")
print("-" * 80)
try:
    result = subprocess.run([sys.executable, "-m", "pip", "list"],
                          capture_output=True, text=True)
    lines = result.stdout.split('\n')
    for line in lines:
        if 'perchance' in line.lower() or 'psycopg2' in line.lower():
            print(f"  ✓ {line}")
except Exception as e:
    print(f"Error listing packages: {e}")
print()

# Try importing packages
print("Testing imports:")
print("-" * 80)

try:
    import psycopg2
    print(f"  ✓ psycopg2 imported successfully from: {psycopg2.__file__}")
except ImportError as e:
    print(f"  ✗ psycopg2 import failed: {e}")

try:
    import perchance
    print(f"  ✓ perchance imported successfully from: {perchance.__file__}")
except ImportError as e:
    print(f"  ✗ perchance import failed: {e}")

print()
print("=" * 80)
