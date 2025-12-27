import os
from typing import Dict, List, Optional
import urllib.request
import urllib.error
import json

INDY_NETWORKS_GITHUB_RAW_BASE = (
    "https://raw.githubusercontent.com/hyperledger-indy/indy-node-monitor/main/fetch-validator-status/networks.json"
)
GENESIS_FILENAME = "pool_transactions_genesis.json"


def get_genesis_txns_from_did_indy_folder(
    path: str, genesis_filename: Optional[str] = None
) -> Dict[str, str]:
    """Retrieves mapping from local folder.

    Expects a path to a folder with the following structure:
    <namespace>/<sub-namespace>/<genesis_file_name>
    Default for genesis_filename is pool_transactions_genesis.json
    Example: sovrin/staging/pool_transactions_genesis.json

    """
    genesis_map = dict()

    genesis_filename = genesis_filename if genesis_filename else GENESIS_FILENAME

    entries = os.listdir(path)
    filtered_entries = list(
        filter(
            lambda entry: not entry.startswith(".")
            and not os.path.isfile(os.path.join(path, entry)),
            entries,
        )
    )

    for entry in filtered_entries:
        entry_p = os.path.join(path, entry)
        namespace = entry

        sub_entries = os.listdir(os.path.join(path, entry))

        for sub_entry in sub_entries:

            sub_entry_p = os.path.join(entry_p, sub_entry)
            sub_namespace = sub_entry if os.path.isdir(sub_entry_p) else None

            if sub_namespace:
                _namespace = namespace + ":" + sub_namespace
                file_p = os.path.join(sub_entry_p, GENESIS_FILENAME)
                if os.path.isfile(file_p):
                    genesis_map[_namespace] = file_p
            else:
                file_p = os.path.join(entry_p, GENESIS_FILENAME)
                if os.path.isfile(file_p):
                    genesis_map[namespace] = file_p
    return genesis_map


def get_genesis_txns_from_did_indy_repo_by_name(
    namespaces: List[str], genesis_filename: Optional[str] = None,
    *,
    repo_base_url: Optional[str] = None,
) -> Dict[str, str]:
    """Retrieves genesis txn from indy networks monitor repo given their names."""
    genesis_map = dict()

    genesis_filename = genesis_filename if genesis_filename else GENESIS_FILENAME
    networks_json_url = repo_base_url or INDY_NETWORKS_GITHUB_RAW_BASE

    base_dir = "networks"

    try:
        with urllib.request.urlopen(networks_json_url) as response:
            networks_data = json.loads(response.read().decode())
    except (urllib.error.URLError, json.JSONDecodeError) as e:
        print(f"Could not fetch or parse networks.json: {e}")
        return genesis_map

    for namespace in namespaces:
        genesis_url = None
        for network_key, network_info in networks_data.items():
            if network_info.get("indyNamespace") == namespace:
                genesis_url = network_info.get("genesisUrl")
                break
        
        if not genesis_url:
            print(f"Could not find genesis URL for namespace: {namespace}")
            continue

        name = namespace.replace(":", "/")
        parts = iter(name.split("/"))
        main = next(parts, None)
        sub = next(parts, None)

        target_local_path = f"{base_dir}/{name}/{genesis_filename}"
        try:
            # Create directories if they don't exist
            if not os.path.isdir(f"{base_dir}"):
                os.mkdir(f"{base_dir}")
            if not os.path.isdir(f"{base_dir}/{main}"):
                os.mkdir(f"{base_dir}/{main}")
            if sub and not os.path.isdir(f"{base_dir}/{main}/{sub}"):
                os.mkdir(f"{base_dir}/{main}/{sub}")

            urllib.request.urlretrieve(genesis_url, target_local_path)
            genesis_map[namespace] = target_local_path

        except (urllib.error.URLError, FileNotFoundError) as e:
            print(f"Could not fetch genesis file for {namespace} from {genesis_url}: {e}")

    return genesis_map
