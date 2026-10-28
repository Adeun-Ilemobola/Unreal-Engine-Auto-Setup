"""Read-only packaging inputs/preflight. Running this module never writes an archive."""
import json
from pathlib import Path
import re

DOCUMENTS = ("README.md", "CAPABILITIES.md", "VALIDATION.md")
ASSETS = ("package.json", "media/unreal.svg", *DOCUMENTS, "LICENSE")


def runtime_files(source):
    """Flat CommonJS production modules; tests/tools live outside this boundary."""
    return tuple(sorted(source.glob("*.js")))


def package_files(root):
    source = root / "unreal-auto-setup"
    return (*runtime_files(source), *(source / name for name in ASSETS))


def validate(root):
    """Fail before packaging if inputs, literal local imports or doc mirrors drift."""
    source = root / "unreal-auto-setup"
    files = package_files(root)
    for file in files:
        if not file.is_file():
            raise ValueError(f"Missing packaging input: {file}")
    manifest = json.loads((source / "package.json").read_text(encoding="utf-8"))
    entry = (source / manifest["main"]).resolve()
    included = {file.resolve() for file in files}
    if entry not in included:
        raise ValueError(f"Entry point is not packaged: {entry}")
    for file in runtime_files(source):
        text = file.read_text(encoding="utf-8")
        # This repository uses literal local CommonJS imports. Computed imports need
        # explicit review; this preflight does not claim to parse arbitrary JavaScript.
        for local in re.findall(r"\brequire\(\s*['\"](\.[^'\"]+)['\"]\s*\)", text):
            target = file.parent / local
            if not target.suffix:
                target = target.with_suffix(".js")
            if target.resolve() not in included:
                raise ValueError(f"Unpackaged local import in {file.name}: {local}")
    for name in DOCUMENTS:
        if (root / name).read_bytes() != (source / name).read_bytes():
            raise ValueError(f"Documentation copies differ: {name}; edit extension copy, then mirror it")
    return files


if __name__ == "__main__":
    workspace = Path(__file__).resolve().parent
    checked = validate(workspace)
    print(f"Packaging preflight passed: {len(checked)} inputs, {len(runtime_files(workspace / 'unreal-auto-setup'))} runtime modules, 3 document mirrors")
