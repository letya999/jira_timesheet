
code = """
# --- Flexible Org & Roles ---
def fetch_org_units(_headers=None):
    response = requests.get(f"{BACKEND_URL}/org/units", headers=_headers or get_headers())
    return response.json() if response.status_code == 200 else []

def create_org_unit(name, parent_id=None, reporting_period="weekly"):
    payload = {"name": name, "reporting_period": reporting_period}
    if parent_id: payload["parent_id"] = parent_id
    response = requests.post(f"{BACKEND_URL}/org/units", json=payload, headers=get_headers())
    return response.status_code == 200

def update_org_unit(unit_id, name=None, parent_id=None, reporting_period=None):
    payload = {}
    if name: payload["name"] = name
    if parent_id is not None: payload["parent_id"] = parent_id
    if reporting_period: payload["reporting_period"] = reporting_period
    response = requests.patch(f"{BACKEND_URL}/org/units/{unit_id}", json=payload, headers=get_headers())
    return response.status_code == 200

def delete_org_unit(unit_id):
    response = requests.delete(f"{BACKEND_URL}/org/units/{unit_id}", headers=get_headers())
    return response.status_code == 204

def fetch_roles(_headers=None):
    response = requests.get(f"{BACKEND_URL}/org/roles", headers=_headers or get_headers())
    return response.json() if response.status_code == 200 else []

def create_role(name, is_system=False):
    response = requests.post(f"{BACKEND_URL}/org/roles", json={"name": name, "is_system": is_system}, headers=get_headers())
    return response.status_code == 200

def delete_role(role_id):
    response = requests.delete(f"{BACKEND_URL}/org/roles/{role_id}", headers=get_headers())
    return response.status_code == 204

def fetch_approval_routes(unit_id, target_type=None):
    params = {}
    if target_type: params["target_type"] = target_type
    response = requests.get(f"{BACKEND_URL}/org/units/{unit_id}/approval-routes", params=params, headers=get_headers())
    return response.json() if response.status_code == 200 else []

def create_approval_route(unit_id, target_type, step_order, role_id):
    payload = {"org_unit_id": unit_id, "target_type": target_type, "step_order": step_order, "role_id": role_id}
    response = requests.post(f"{BACKEND_URL}/org/units/approval-routes", json=payload, headers=get_headers())
    return response.status_code == 200

def delete_approval_route(route_id):
    response = requests.delete(f"{BACKEND_URL}/org/units/approval-routes/{route_id}", headers=get_headers())
    return response.status_code == 204

def fetch_unit_roles(unit_id):
    response = requests.get(f"{BACKEND_URL}/org/units/{unit_id}/roles", headers=get_headers())
    return response.json() if response.status_code == 200 else []

def assign_unit_role(unit_id, user_id, role_id):
    payload = {"org_unit_id": unit_id, "user_id": user_id, "role_id": role_id}
    response = requests.post(f"{BACKEND_URL}/org/units/roles", json=payload, headers=get_headers())
    return response.status_code == 200

def remove_unit_role(assignment_id):
    response = requests.delete(f"{BACKEND_URL}/org/units/roles/{assignment_id}", headers=get_headers())
    return response.status_code == 204
"""

with open("frontend/api_client.py", "a", encoding="utf-8") as f:
    f.write(code)
print("Appended successfully")
