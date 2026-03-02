import asyncio
import os
import sys

# Add the current directory to sys.path so we can import core and models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from init_db import init_db
from seed import seed


async def full_reinit():
    print("=== DATABASE RE-INITIALIZATION START ===")
    await init_db()
    print("--- Seeding basic data ---")
    await seed()
    print("=== DATABASE RE-INITIALIZATION COMPLETE ===")

if __name__ == "__main__":
    asyncio.run(full_reinit())
