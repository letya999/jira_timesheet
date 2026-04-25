import ast
import glob


def add_docstrings(filepath):
    with open(filepath, encoding="utf-8") as f:
        source = f.read()

    tree = ast.parse(source)
    lines = source.splitlines()

    changes = []

    for node in ast.walk(tree):
        if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
            # Check if it has a decorator with router
            has_router = False
            for d in node.decorator_list:
                is_router_call = (
                    isinstance(d, ast.Call)
                    and isinstance(d.func, ast.Attribute)
                    and getattr(d.func.value, "id", "") == "router"
                )
                if is_router_call:
                    has_router = True
                elif isinstance(d, ast.Attribute) and getattr(d.value, "id", "") == "router":
                    has_router = True

            if has_router:
                # Check if it lacks a docstring
                if ast.get_docstring(node) is None:
                    # Determine where to insert the docstring
                    body_lineno = node.body[0].lineno - 1

                    # Create a simple docstring based on function name
                    func_name = node.name.replace("_", " ").capitalize()

                    # We will insert it at the first line of the body
                    changes.append((body_lineno, '    """' + func_name + ' endpoint."""'))

    # Apply changes from bottom to top so line numbers don't shift
    changes.sort(key=lambda x: x[0], reverse=True)

    for line_idx, docstring in changes:
        lines.insert(line_idx, docstring)

    if changes:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        print(f"Added docstrings to {filepath}")


directory = "backend/api/endpoints"
for filepath in glob.glob(f"{directory}/*.py"):
    add_docstrings(filepath)
