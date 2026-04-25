import glob

router_replacement = """router = APIRouter(
    responses={
        400: {"description": "Bad Request"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
        422: {"description": "Validation Error"},
        429: {"description": "Too Many Requests"},
        500: {"description": "Internal Server Error"},
    }
)"""

directory = "backend/api/endpoints"
for filepath in glob.glob(f"{directory}/*.py"):
    with open(filepath, encoding="utf-8") as f:
        content = f.read()

    if "router = APIRouter()" in content:
        content = content.replace("router = APIRouter()", router_replacement)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {filepath}")
