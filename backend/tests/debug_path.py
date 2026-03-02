import os
import sys


def test_print_path():
    print(f"\nCWD: {os.getcwd()}")
    print(f"PYTHONPATH: {os.environ.get('PYTHONPATH')}")
    print("SYS PATH:")
    for p in sys.path:
        print(f"  {p}")
    try:
        import core  # noqa: F401

        print("Import core: SUCCESS")
    except ImportError as e:
        print(f"Import core: FAILED ({e})")
    try:
        import main  # noqa: F401

        print("Import main: SUCCESS")
    except ImportError as e:
        print(f"Import main: FAILED ({e})")
